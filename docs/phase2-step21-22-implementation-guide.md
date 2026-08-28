# STEP21/STEP22 AWS実施手順書

この手順書は、STEP21「API Gateway連携」とSTEP22「DynamoDB導入」を実際のAWS開発環境で行うための作業手順である。

対象リージョンは `ap-northeast-1`、AWS CLIプロファイルは `oms-dev` を前提にする。アカウントIDは必要に応じて自分の開発用アカウントに読み替える。

## 0. 前提

### ローカル前提

- AWS CLI v2 がインストール済み
- `aws sts get-caller-identity --profile oms-dev` が成功する
- CDK bootstrap が完了済み
- Node.js / npm が利用可能
- `.env.local` はGit管理外

ローカル開発で必要な環境変数の一覧は [`local-environment-variables.md`](./local-environment-variables.md) にまとめてある。

確認コマンド:

```bash
aws sts get-caller-identity --profile oms-dev
aws configure list --profile oms-dev
npx aws-cdk --version
```

期待する確認結果:

- `Account` が開発用AWSアカウントである
- `Region` は `ap-northeast-1` を使う
- `AccessDenied` や `No access` が出ない

### 権限前提

STEP21/22では、少なくとも次の操作権限が必要になる。

- Lambda: 関数作成、更新、ログ出力、実行ロール設定
- API Gateway: HTTP APIまたはREST APIの作成、ルート作成、CORS設定
- DynamoDB: テーブル作成、読み書き
- IAM: Lambda実行ロール作成、ポリシー付与、`iam:PassRole`
- CloudWatch Logs: ロググループ/ログストリーム作成、ログ書き込み

PowerUserAccessだけではIAMロール作成やポリシー付与で失敗する場合がある。CDK bootstrap時と同様に、開発中はAdministratorAccess相当、または上記を含む専用Permission Setを使う。

## 1. 実施方針

このプロジェクトの最終形はCDKで再現可能にする。手作業でAWSコンソールから作ることもできるが、学習プロジェクトとしてはCDKで作成する手順を推奨する。

実施順序:

1. DynamoDBテーブルを作る
2. Lambda実行ロールを作る
3. Lambda関数をデプロイする
4. API Gatewayを作る
5. API GatewayからLambdaを呼ぶ
6. CORSを設定する
7. curlでAPI疎通する
8. Next.jsの `NEXT_PUBLIC_API_BASE_URL` にAPI Gateway URLを設定する

現時点のコードは、学習用にNext.js Route HandlerとLambdaハンドラが同じドメイン層を参照している。AWS Lambdaへ実デプロイする場合は、TypeScriptをJavaScriptへバンドルし、`@/` import aliasを解決した成果物をアップロードする必要がある。

## 2. 命名

開発環境では名前を固定しておくと、ログや請求確認がしやすい。

```text
Project: oms
Environment: dev
Region: ap-northeast-1
DynamoDB table: oms-dev-orders
Lambda function: oms-dev-order-api
API Gateway: oms-dev-order-api
Stage: dev
```

タグも付与する。

```text
Project=order-management-system
Environment=dev
Owner=<your-name>
ManagedBy=cdk
```

## 3. STEP22 DynamoDB導入

先に永続化先を用意する。API Gatewayからの通信よりも、Lambdaが保存できる状態を先に作る方が切り分けしやすい。

### 3.1 テーブル設計

最初のテーブルはシンプルに注文IDで1件取得できる形にする。

| 項目 | 値 |
| --- | --- |
| テーブル名 | `oms-dev-orders` |
| Partition key | `orderId` |
| Sort key | なし |
| 課金モード | On-demand |
| Point-in-time recovery | 開発環境では任意 |
| Deletion protection | 開発環境では任意 |

保存する代表的な属性:

```text
orderId
orderedAt
customerName
customerEmail
shippingAddress
status
paymentMethod
items
totalAmount
createdAt
updatedAt
```

注意点:

- DynamoDBのキー名は `orderId` にする
- フロントエンドの型では `id` を使っているため、Repository層で `id <-> orderId` を変換する
- `totalAmount` はクライアント値を信用せず、Lambda/Service側で再計算する
- `status` は許可された値だけ保存する

### 3.2 AWS CLIでテーブルを作る場合

CDK導入前に手動確認したい場合だけ使う。

```bash
aws dynamodb create-table \
  --table-name oms-dev-orders \
  --attribute-definitions AttributeName=orderId,AttributeType=S \
  --key-schema AttributeName=orderId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1 \
  --profile oms-dev
```

作成状態を確認する。

```bash
aws dynamodb wait table-exists \
  --table-name oms-dev-orders \
  --region ap-northeast-1 \
  --profile oms-dev

aws dynamodb describe-table \
  --table-name oms-dev-orders \
  --region ap-northeast-1 \
  --profile oms-dev
```

### 3.3 動作確認用itemを投入する

```bash
aws dynamodb put-item \
  --table-name oms-dev-orders \
  --region ap-northeast-1 \
  --profile oms-dev \
  --item '{
    "orderId": {"S": "ORD-DEV-001"},
    "orderedAt": {"S": "2026-08-21T00:00:00.000Z"},
    "customerName": {"S": "テスト顧客"},
    "customerEmail": {"S": "test@example.com"},
    "shippingAddress": {"S": "東京都千代田区1-1-1"},
    "status": {"S": "processing"},
    "paymentMethod": {"S": "credit-card"},
    "totalAmount": {"N": "12000"},
    "createdAt": {"S": "2026-08-21T00:00:00.000Z"},
    "updatedAt": {"S": "2026-08-21T00:00:00.000Z"}
  }'
```

取得確認:

```bash
aws dynamodb get-item \
  --table-name oms-dev-orders \
  --key '{"orderId":{"S":"ORD-DEV-001"}}' \
  --region ap-northeast-1 \
  --profile oms-dev
```

## 4. Lambda実行ロール

LambdaにはDynamoDB読み書きとCloudWatch Logs出力の権限を付ける。

### 4.1 信頼ポリシーを用意する

`/tmp/lambda-trust-policy.json` などに次を用意する。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

作成:

```bash
aws iam create-role \
  --role-name oms-dev-order-api-lambda-role \
  --assume-role-policy-document file:///tmp/lambda-trust-policy.json \
  --profile oms-dev
```

### 4.2 ログ出力権限を付与する

```bash
aws iam attach-role-policy \
  --role-name oms-dev-order-api-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  --profile oms-dev
```

### 4.3 DynamoDB権限を付与する

`/tmp/oms-dev-order-api-dynamodb-policy.json` を用意する。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:ap-northeast-1:<account-id>:table/oms-dev-orders"
    }
  ]
}
```

`<account-id>` は次で確認した値に置き換える。

```bash
aws sts get-caller-identity --profile oms-dev --query Account --output text
```

ポリシー付与:

```bash
aws iam put-role-policy \
  --role-name oms-dev-order-api-lambda-role \
  --policy-name oms-dev-order-api-dynamodb-policy \
  --policy-document file:///tmp/oms-dev-order-api-dynamodb-policy.json \
  --profile oms-dev
```

## 5. Lambda関数をデプロイする

### 5.1 重要な注意

`src/lambda/order-api-gateway-handler.ts` はTypeScriptであり、`@/features/...` のimport aliasを使っている。そのままAWS Lambdaへアップロードしても実行できない。

必要な対応:

- TypeScriptをJavaScriptへバンドルする
- `@/` aliasを解決する
- Lambdaで不要なNext.js実行環境に依存させない
- DynamoDB Repository実装に差し替える

CDKを使う場合は、`aws-lambda-nodejs` の `NodejsFunction` でバンドルする構成が扱いやすい。

### 5.2 Lambda環境変数

Lambdaには最低限次を設定する。ローカルの `.env.local` とは役割が異なるため、詳細は [`local-environment-variables.md`](./local-environment-variables.md) を参照する。

```text
ORDERS_TABLE_NAME=oms-dev-orders
NODE_OPTIONS=--enable-source-maps
```

将来、環境分離を入れる場合は次も持たせる。

```text
APP_ENV=dev
```

### 5.3 zipを作成してLambda関数としてデプロイする

ここでは、`src/lambda/order-api-gateway-handler.ts` をzipにまとめ、そのzipをAWS Lambda関数として実際にデプロイする。

最初にSSOログイン状態を確認する。

```bash
aws sso login --profile oms-dev

aws sts get-caller-identity \
  --profile oms-dev
```

#### 5.3.1 バンドル用の依存を入れる

未導入の場合は、Lambdaバンドル用の `esbuild` とDynamoDBアクセス用のAWS SDKを追加する。

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
npm install -D esbuild
```

このプロジェクトのLambdaソースはTypeScriptかつ `@/` import aliasを使っているため、Lambdaへアップロードする前に1つのJavaScriptへバンドルする。

#### 5.3.2 Lambda用zipを作る

一時ディレクトリに成果物を作る。

```bash
rm -rf /tmp/oms-order-api-lambda
mkdir -p /tmp/oms-order-api-lambda

./node_modules/.bin/esbuild src/lambda/order-api-gateway-handler.ts \
  --bundle \
  --platform=node \
  --target=node22 \
  --format=cjs \
  --outfile=/tmp/oms-order-api-lambda/index.js \
  --alias:@=./src \
  --sourcemap

cd /tmp/oms-order-api-lambda
zip -r order-api.zip index.js index.js.map
```

zipの中身を確認する。

```bash
unzip -l /tmp/oms-order-api-lambda/order-api.zip
```

期待する中身:

```text
index.js
index.js.map
```

注意:

- handler名は `index.handler` にする
- `src/lambda/order-api-gateway-handler.ts` の `export async function handler` がLambdaの入口になる
- `ORDERS_TABLE_NAME=oms-dev-orders` が設定されている Lambda では DynamoDB Repository が使われる
- `ORDERS_TABLE_NAME` が未設定のローカル Next.js では注文系 API がエラーになるため、`.env.local` に `ORDERS_TABLE_NAME` を設定して起動する

#### 5.3.3 Lambda実行ロールARNを確認する

既に作成したLambda実行ロールのARNを取得する。

```bash
LAMBDA_ROLE_ARN=$(aws iam get-role \
  --role-name oms-dev-order-api-lambda-role \
  --query 'Role.Arn' \
  --output text \
  --profile oms-dev)

echo "$LAMBDA_ROLE_ARN"
```

期待する形式:

```text
arn:aws:iam::<account-id>:role/oms-dev-order-api-lambda-role
```

#### 5.3.4 Lambda関数を新規作成してzipをデプロイする

`oms-dev-order-api` 関数がまだ存在しない場合は、zipを指定してLambda関数を作成する。

```bash
aws lambda create-function \
  --function-name oms-dev-order-api \
  --runtime nodejs22.x \
  --role "$LAMBDA_ROLE_ARN" \
  --handler index.handler \
  --zip-file fileb:///tmp/oms-order-api-lambda/order-api.zip \
  --timeout 10 \
  --memory-size 256 \
  --environment Variables='{ORDERS_TABLE_NAME=oms-dev-orders,NODE_OPTIONS=--enable-source-maps,APP_ENV=dev}' \
  --region ap-northeast-1 \
  --profile oms-dev
```

作成完了を待つ。

```bash
aws lambda wait function-active \
  --function-name oms-dev-order-api \
  --region ap-northeast-1 \
  --profile oms-dev
```

作成結果を確認する。

```bash
aws lambda get-function-configuration \
  --function-name oms-dev-order-api \
  --query '{FunctionName:FunctionName,Runtime:Runtime,Handler:Handler,State:State,LastUpdateStatus:LastUpdateStatus,Environment:Environment}' \
  --region ap-northeast-1 \
  --profile oms-dev
```

`State` が `Active` であれば、zipをLambda関数としてデプロイできている。

#### 5.3.5 作成済みLambda関数へzipを再デプロイする

既に `oms-dev-order-api` 関数が存在する場合は、関数を作り直さずに設定とコードを更新する。

まず関数の存在を確認する。

```bash
aws lambda get-function \
  --function-name oms-dev-order-api \
  --region ap-northeast-1 \
  --profile oms-dev
```

`ResourceNotFoundException` が出る場合は、関数名またはリージョンが違う。新規作成する場合は、前の `create-function` 手順を使う。

##### 5.3.5.1 関数設定を更新する

作成済み関数のRuntime、Handler、環境変数を確認・更新する。

```bash
aws lambda update-function-configuration \
  --function-name oms-dev-order-api \
  --runtime nodejs22.x \
  --handler index.handler \
  --timeout 10 \
  --memory-size 256 \
  --environment Variables='{ORDERS_TABLE_NAME=oms-dev-orders,NODE_OPTIONS=--enable-source-maps,APP_ENV=dev}' \
  --region ap-northeast-1 \
  --profile oms-dev
```

更新完了を待つ。

```bash
aws lambda wait function-updated \
  --function-name oms-dev-order-api \
  --region ap-northeast-1 \
  --profile oms-dev
```

現在の設定を確認する。

```bash
aws lambda get-function-configuration \
  --function-name oms-dev-order-api \
  --region ap-northeast-1 \
  --profile oms-dev
```

##### 5.3.5.2 関数コードを更新する

zipをアップロードして、作成済みLambda関数のコードを更新する。

```bash
aws lambda update-function-code \
  --function-name oms-dev-order-api \
  --zip-file fileb:///tmp/oms-order-api-lambda/order-api.zip \
  --region ap-northeast-1 \
  --profile oms-dev
```

更新完了を待つ。

```bash
aws lambda wait function-updated \
  --function-name oms-dev-order-api \
  --region ap-northeast-1 \
  --profile oms-dev
```

コード更新日時を確認する。

```bash
aws lambda get-function-configuration \
  --function-name oms-dev-order-api \
  --query '{FunctionName:FunctionName,LastModified:LastModified,Runtime:Runtime,Handler:Handler,State:State,LastUpdateStatus:LastUpdateStatus}' \
  --region ap-northeast-1 \
  --profile oms-dev
```

`LastUpdateStatus` が `Successful` であればデプロイ完了。

#### 5.3.6 Lambda単体で動作確認する

API Gatewayに接続する前に、Lambdaへ直接イベントを渡す。

```bash
aws lambda invoke \
  --function-name oms-dev-order-api \
  --payload '{"httpMethod":"GET","path":"/orders","queryStringParameters":null,"pathParameters":null,"headers":{}}' \
  --cli-binary-format raw-in-base64-out \
  --region ap-northeast-1 \
  --profile oms-dev \
  /tmp/get-orders-response.json
```

レスポンスを確認する。

```bash
cat /tmp/get-orders-response.json
```

期待する形:

```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  },
  "body": "{\"orders\":[],\"total\":0}"
}
```

エラー時はCloudWatch Logsを見る。

```bash
aws logs tail /aws/lambda/oms-dev-order-api \
  --since 10m \
  --region ap-northeast-1 \
  --profile oms-dev
```

#### 5.3.7 AWSコンソールからzipをアップロードする場合

CLIではなくAWSコンソールでzipをアップロードする場合も、zipの作り方は同じである。

手順:

1. AWSコンソールでLambdaを開く
2. リージョンが `ap-northeast-1` であることを確認する
3. 関数 `oms-dev-order-api` を開く
4. `Code` タブを開く
5. `Upload from` から `.zip file` を選ぶ
6. `/tmp/oms-order-api-lambda/order-api.zip` をアップロードする
7. Runtimeを `Node.js 22.x` にする
8. Handlerを `index.handler` にする
9. Environment variablesに `ORDERS_TABLE_NAME=oms-dev-orders` を設定する
10. `Deploy` を押す
11. `Test` からAPI Gateway風のイベントを作って実行する

コンソールでアップロードしても、zip直下の構造は次である必要がある。

```text
order-api.zip
├── index.js
└── index.js.map
```

#### 5.3.8 よくあるデプロイ時エラー

`ResourceConflictException`:

直前の設定更新またはコード更新がまだ処理中。次で待ってから再実行する。

```bash
aws lambda wait function-updated \
  --function-name oms-dev-order-api \
  --region ap-northeast-1 \
  --profile oms-dev
```

`Runtime.ImportModuleError`:

zip内のファイル名またはHandler設定が違う。`index.js` がzip直下にあり、Handlerが `index.handler` になっているか確認する。

`Cannot find module`:

バンドル漏れまたはalias解決漏れ。`npx esbuild` の `--bundle` と `--alias:@=./src` を付けてzipを作り直す。

`AccessDeniedException`:

Lambda実行ロール、またはデプロイに使っているSSOユーザーの権限が不足している。`lambda:UpdateFunctionCode`、`lambda:UpdateFunctionConfiguration`、`lambda:GetFunctionConfiguration`、`iam:PassRole` を確認する。

### 5.4 Lambda単体疎通イベント

API Gateway接続前に、Lambda単体でイベントを渡して動作確認する。

`/tmp/get-orders-event.json`:

```json
{
  "httpMethod": "GET",
  "path": "/orders",
  "queryStringParameters": null,
  "pathParameters": null,
  "headers": {}
}
```

実行:

```bash
aws lambda invoke \
  --function-name oms-dev-order-api \
  --payload fileb:///tmp/get-orders-event.json \
  --region ap-northeast-1 \
  --profile oms-dev \
  /tmp/get-orders-response.json
```

レスポンス確認:

```bash
cat /tmp/get-orders-response.json
```

期待する形:

```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  },
  "body": "{\"orders\":[],\"total\":0}"
}
```

## 6. STEP21 API Gateway連携

### 6.1 API種別

このプロジェクトでは、まずHTTP APIを推奨する。

理由:

- REST APIより設定が少ない
- Lambda proxy integrationと相性が良い
- 今回の注文管理APIでは高度なAPI Gateway機能をまだ使わない

将来、API Key、Usage Plan、詳細なリクエスト検証をAPI Gateway側で使う場合はREST APIも検討する。

### 6.2 ルート

作成するルート:

```text
GET    /orders
GET    /orders/{id}
GET    /orders/{id}/status
POST   /orders
PATCH  /orders/{id}
PATCH  /orders/{id}/status
DELETE /orders/{id}
OPTIONS /{proxy+}
```

Lambda proxy integrationでは、API GatewayがHTTP情報をLambdaイベントとして渡す。Lambda側は `httpMethod`、`path`、`pathParameters`、`queryStringParameters`、`body` を見て処理する。

### 6.3 CORS設定

開発環境では次の設定から始める。

```text
Allow origins: http://localhost:3000
Allow methods: GET,POST,PATCH,DELETE,OPTIONS
Allow headers: Content-Type,X-Request-Id
Expose headers: なし
Max age: 300
Allow credentials: false
```

一時的に疎通確認だけを優先する場合は `*` でもよい。ただし認証CookieやAuthorizationヘッダーを使う段階では、許可originを明示する。

### 6.4 AWS CLIでHTTP APIを作成する

ここでは、API Gateway HTTP APIを作成し、作成済みLambda関数 `oms-dev-order-api` へ接続する。

重要:

- このLambdaハンドラは `event.httpMethod` と `event.path` を見ている
- HTTP APIのデフォルトpayload format `2.0` ではイベント形式が変わる
- そのため、Lambda integrationは `--payload-format-version 1.0` で作成する

#### 6.4.1 アカウントIDとLambda ARNを取得する

```bash
ACCOUNT_ID=$(aws sts get-caller-identity \
  --query Account \
  --output text \
  --profile oms-dev)

LAMBDA_ARN=$(aws lambda get-function \
  --function-name oms-dev-order-api \
  --query 'Configuration.FunctionArn' \
  --output text \
  --region ap-northeast-1 \
  --profile oms-dev)

echo "$ACCOUNT_ID"
echo "$LAMBDA_ARN"
```

#### 6.4.2 HTTP APIを作成する

`$default` stageを使う構成にする。これにより、URLは `/dev` などのstage名なしで呼び出せる。

```bash
API_ID=$(aws apigatewayv2 create-api \
  --name oms-dev-order-api \
  --protocol-type HTTP \
  --cors-configuration '{"AllowOrigins":["http://localhost:3000"],"AllowMethods":["GET","POST","PATCH","DELETE","OPTIONS"],"AllowHeaders":["Content-Type","X-Request-Id"],"MaxAge":300}' \
  --query ApiId \
  --output text \
  --region ap-northeast-1 \
  --profile oms-dev)

echo "$API_ID"
```

作成されたAPIを確認する。

```bash
aws apigatewayv2 get-api \
  --api-id "$API_ID" \
  --region ap-northeast-1 \
  --profile oms-dev
```

#### 6.4.3 Lambda integrationを作成する

```bash
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id "$API_ID" \
  --integration-type AWS_PROXY \
  --integration-uri "$LAMBDA_ARN" \
  --payload-format-version 1.0 \
  --query IntegrationId \
  --output text \
  --region ap-northeast-1 \
  --profile oms-dev)

echo "$INTEGRATION_ID"
```

#### 6.4.4 ルートを作成する

同じLambda integrationへ注文APIの各ルートを接続する。

```bash
aws apigatewayv2 create-route \
  --api-id "$API_ID" \
  --route-key 'GET /orders' \
  --target "integrations/$INTEGRATION_ID" \
  --region ap-northeast-1 \
  --profile oms-dev

aws apigatewayv2 create-route \
  --api-id "$API_ID" \
  --route-key 'POST /orders' \
  --target "integrations/$INTEGRATION_ID" \
  --region ap-northeast-1 \
  --profile oms-dev

aws apigatewayv2 create-route \
  --api-id "$API_ID" \
  --route-key 'GET /orders/{id}' \
  --target "integrations/$INTEGRATION_ID" \
  --region ap-northeast-1 \
  --profile oms-dev

aws apigatewayv2 create-route \
  --api-id "$API_ID" \
  --route-key 'PATCH /orders/{id}' \
  --target "integrations/$INTEGRATION_ID" \
  --region ap-northeast-1 \
  --profile oms-dev

aws apigatewayv2 create-route \
  --api-id "$API_ID" \
  --route-key 'DELETE /orders/{id}' \
  --target "integrations/$INTEGRATION_ID" \
  --region ap-northeast-1 \
  --profile oms-dev

aws apigatewayv2 create-route \
  --api-id "$API_ID" \
  --route-key 'GET /orders/{id}/status' \
  --target "integrations/$INTEGRATION_ID" \
  --region ap-northeast-1 \
  --profile oms-dev

aws apigatewayv2 create-route \
  --api-id "$API_ID" \
  --route-key 'PATCH /orders/{id}/status' \
  --target "integrations/$INTEGRATION_ID" \
  --region ap-northeast-1 \
  --profile oms-dev
```

ルート一覧を確認する。

```bash
aws apigatewayv2 get-routes \
  --api-id "$API_ID" \
  --region ap-northeast-1 \
  --profile oms-dev
```

#### 6.4.5 stageを作成する

`$default` stageをauto deployで作成する。

```bash
aws apigatewayv2 create-stage \
  --api-id "$API_ID" \
  --stage-name '$default' \
  --auto-deploy \
  --region ap-northeast-1 \
  --profile oms-dev
```

stageを確認する。

```bash
aws apigatewayv2 get-stages \
  --api-id "$API_ID" \
  --region ap-northeast-1 \
  --profile oms-dev
```

#### 6.4.6 API GatewayからLambdaを呼べるようにする

API GatewayにLambda invoke権限を付与する。

```bash
aws lambda add-permission \
  --function-name oms-dev-order-api \
  --statement-id "AllowExecutionFromApiGateway-$API_ID" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:ap-northeast-1:${ACCOUNT_ID}:${API_ID}/*/*/*" \
  --region ap-northeast-1 \
  --profile oms-dev
```

同じ `statement-id` で再実行すると `ResourceConflictException` になる。その場合は、既に権限付与済みなので次へ進むか、別のstatement idを使う。

権限を確認する。

```bash
aws lambda get-policy \
  --function-name oms-dev-order-api \
  --region ap-northeast-1 \
  --profile oms-dev
```

#### 6.4.7 API Gateway URLを取得する

```bash
API_BASE_URL=$(aws apigatewayv2 get-api \
  --api-id "$API_ID" \
  --query ApiEndpoint \
  --output text \
  --region ap-northeast-1 \
  --profile oms-dev)

echo "$API_BASE_URL"
```

期待する形式:

```text
https://<api-id>.execute-api.ap-northeast-1.amazonaws.com
```

#### 6.4.8 API Gateway経由で疎通確認する

```bash
curl -i "$API_BASE_URL/orders"
```

期待:

```text
HTTP/2 200
```

body:

```json
{
  "orders": [],
  "total": 0
}
```

POSTも確認する。

```bash
curl -i -X POST "$API_BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "テスト顧客",
    "customerEmail": "test@example.com",
    "shippingAddress": "東京都千代田区1-1-1",
    "paymentMethod": "credit-card",
    "items": [
      {
        "productName": "テスト商品",
        "quantity": 2,
        "unitPrice": 3000
      }
    ]
  }'
```

期待:

```text
HTTP/2 201
```

#### 6.4.9 AWSコンソールからAPIを作成する場合

CLIではなくAWSコンソールで作成する場合は、次の順で設定する。

1. AWSコンソールで `API Gateway` を開く
2. `Create API` を選ぶ
3. `HTTP API` を選ぶ
4. API名を `oms-dev-order-api` にする
5. IntegrationにLambdaを選ぶ
6. リージョン `ap-northeast-1` の `oms-dev-order-api` Lambda関数を選ぶ
7. Routesに注文APIのルートを追加する
8. Stageは `$default` を使い、Auto-deployを有効にする
9. CORSで `http://localhost:3000`、`GET,POST,PATCH,DELETE,OPTIONS`、`Content-Type,X-Request-Id` を許可する
10. 作成後、API GatewayがLambdaにinvoke permissionを追加しているか確認する

コンソール作成時の注意:

- Integrationのpayload formatが選べる場合は `1.0` を選ぶ
- `2.0` のままだと、現在のLambdaハンドラは `httpMethod` を読めず期待通りに動かない
- 作成後のInvoke URLを `NEXT_PUBLIC_API_BASE_URL` に設定する

### 6.5 API Gateway URLを確認する

デプロイ後のURLは次の形になる。

```text
https://<api-id>.execute-api.ap-northeast-1.amazonaws.com
```

stageを明示する構成では次の形になる。

```text
https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/dev
```

フロントエンドの `NEXT_PUBLIC_API_BASE_URL` には、`/orders` の直前までを設定する。

例:

```env
NEXT_PUBLIC_API_BASE_URL=https://<api-id>.execute-api.ap-northeast-1.amazonaws.com
```

または:

```env
NEXT_PUBLIC_API_BASE_URL=https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/dev
```

## 7. curlでAPI Gatewayを確認する

API Gateway URLを変数に入れる。

```bash
API_BASE_URL="https://<api-id>.execute-api.ap-northeast-1.amazonaws.com"
```

### 7.1 一覧取得

```bash
curl -i "$API_BASE_URL/orders"
```

期待:

```text
HTTP/2 200
content-type: application/json
access-control-allow-origin: *
```

body:

```json
{
  "orders": [],
  "total": 0
}
```

### 7.2 登録

```bash
curl -i -X POST "$API_BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "テスト顧客",
    "customerEmail": "test@example.com",
    "shippingAddress": "東京都千代田区1-1-1",
    "paymentMethod": "credit-card",
    "items": [
      {
        "productName": "テスト商品",
        "quantity": 2,
        "unitPrice": 3000
      }
    ]
  }'
```

期待:

```text
HTTP/2 201
```

body:

```json
{
  "order": {
    "id": "ORD-...",
    "status": "pending",
    "totalAmount": 6000
  }
}
```

### 7.3 詳細取得

登録で返った `id` を使う。

```bash
curl -i "$API_BASE_URL/orders/<order-id>"
```

期待:

```json
{
  "order": {
    "id": "<order-id>"
  }
}
```

### 7.4 ステータス更新

```bash
curl -i -X PATCH "$API_BASE_URL/orders/<order-id>/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"shipped"}'
```

期待:

```json
{
  "order": {
    "id": "<order-id>",
    "status": "shipped"
  }
}
```

### 7.5 削除

```bash
curl -i -X DELETE "$API_BASE_URL/orders/<order-id>"
```

期待:

```json
{
  "deleted": true,
  "orderId": "<order-id>"
}
```

## 8. Next.jsからAWS APIへ接続する

`.env.local` には API Gateway URL と AWS 接続先を設定する。具体例は [`local-environment-variables.md`](./local-environment-variables.md) を参照する。

フロントエンドのAPIクライアントは、ローカル開発ではNext.js Route Handlerの `/api/orders` を呼び、`NEXT_PUBLIC_API_BASE_URL` が設定されている場合はAPI Gatewayの `/orders` を呼ぶ。

```text
NEXT_PUBLIC_API_BASE_URL 未設定:
  http://localhost:3000/api/orders

NEXT_PUBLIC_API_BASE_URL 設定済み:
  https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/orders
```

API Gateway側に `/api/orders` ルートを作っていない場合、ブラウザが `https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/api/orders` を呼ぶとルート不一致になり、CORSエラーに見えることがある。この場合はフロントエンドのAPIクライアントが `/api` prefixを外しているか確認する。

Next.js開発サーバーを再起動する。

```bash
npm run dev
```

確認する画面:

```text
http://localhost:3000/orders
http://localhost:3000/orders/new
```

確認観点:

- 注文一覧がAPI Gateway経由で取得できる
- 注文登録が成功する
- 登録後にDynamoDBへitemが増える
- 注文詳細が表示できる
- ステータス更新がDynamoDBへ反映される
- ブラウザのNetworkタブで `execute-api.ap-northeast-1.amazonaws.com` へ通信している

## 9. CloudWatch Logs確認

Lambdaログ:

```bash
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/oms-dev-order-api \
  --region ap-northeast-1 \
  --profile oms-dev
```

直近ログを追う:

```bash
aws logs tail /aws/lambda/oms-dev-order-api \
  --since 10m \
  --follow \
  --region ap-northeast-1 \
  --profile oms-dev
```

見るべきポイント:

- Lambdaが呼ばれているか
- `AccessDeniedException` が出ていないか
- DynamoDBのテーブル名が正しいか
- JSON parse errorが出ていないか
- CORS preflightの `OPTIONS` が処理されているか

## 10. DynamoDB確認

一覧:

```bash
aws dynamodb scan \
  --table-name oms-dev-orders \
  --limit 10 \
  --region ap-northeast-1 \
  --profile oms-dev
```

1件取得:

```bash
aws dynamodb get-item \
  --table-name oms-dev-orders \
  --key '{"orderId":{"S":"<order-id>"}}' \
  --region ap-northeast-1 \
  --profile oms-dev
```

注意:

- `scan` は開発確認用に限定する
- 本番の一覧検索はアクセスパターンに応じて `Query` とGSIを検討する

## 11. CDKで作る場合の構成例

Phase 3でCDK化するときは、次のリソースを1つのStackにまとめる。

```text
OrderApiStack
├── DynamoDB Table: oms-dev-orders
├── Lambda Function: oms-dev-order-api
├── Lambda Execution Role
└── API Gateway HTTP API
```

必要なCDKパッケージ例:

```bash
npm install aws-cdk-lib constructs
npm install -D esbuild
```

Lambdaは `NodejsFunction` を使う。

```ts
new NodejsFunction(this, "OrderApiFunction", {
  entry: "src/lambda/order-api-gateway-handler.ts",
  handler: "handler",
  runtime: Runtime.NODEJS_22_X,
  environment: {
    ORDERS_TABLE_NAME: ordersTable.tableName,
  },
});
```

DynamoDBテーブルは次の考え方で作る。

```ts
new Table(this, "OrdersTable", {
  tableName: "oms-dev-orders",
  partitionKey: {
    name: "orderId",
    type: AttributeType.STRING,
  },
  billingMode: BillingMode.PAY_PER_REQUEST,
});
```

権限はテーブルからLambdaへ付与する。

```ts
ordersTable.grantReadWriteData(orderApiFunction);
```

API GatewayはHTTP APIとLambda integrationを使う。

```ts
const api = new HttpApi(this, "OrderHttpApi", {
  apiName: "oms-dev-order-api",
  corsPreflight: {
    allowHeaders: ["Content-Type", "X-Request-Id"],
    allowMethods: [
      CorsHttpMethod.DELETE,
      CorsHttpMethod.GET,
      CorsHttpMethod.OPTIONS,
      CorsHttpMethod.PATCH,
      CorsHttpMethod.POST,
    ],
    allowOrigins: ["http://localhost:3000"],
  },
});
```

ルートは同じLambda integrationへ集約する。

```ts
api.addRoutes({
  path: "/orders",
  methods: [HttpMethod.GET, HttpMethod.POST],
  integration,
});

api.addRoutes({
  path: "/orders/{id}",
  methods: [HttpMethod.GET, HttpMethod.PATCH, HttpMethod.DELETE],
  integration,
});

api.addRoutes({
  path: "/orders/{id}/status",
  methods: [HttpMethod.GET, HttpMethod.PATCH],
  integration,
});
```

デプロイ後に `api.apiEndpoint` をOutputする。

```ts
new CfnOutput(this, "OrderApiUrl", {
  value: api.apiEndpoint,
});
```

## 12. よくあるエラー

### `No access`

AWS SSOのユーザーに対象アカウント/Permission Setが割り当てられていない。

対応:

```bash
aws sso login --profile oms-dev
aws sts get-caller-identity --profile oms-dev
```

それでも失敗する場合は、IAM Identity Centerでユーザーに対象AWSアカウントの権限セットを割り当てる。

### `not authorized to perform iam:GetRole`

Lambdaロール作成やCDK bootstrapに必要なIAM権限が足りない。

対応:

- 開発用Permission SetにIAM操作権限を追加する
- 追加後に `aws sso login --profile oms-dev` をやり直す
- 失敗したCloudFormation Stackがある場合は、権限追加後に削除または再実行する

### CORS error

API GatewayまたはLambdaレスポンスにCORSヘッダーが不足している。

確認:

```bash
curl -i -X OPTIONS "$API_BASE_URL/orders" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"
```

見るヘッダー:

```text
access-control-allow-origin
access-control-allow-methods
access-control-allow-headers
```

ブラウザのエラーURLが `/api/orders` になっている場合:

```text
https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/api/orders
```

API Gatewayには `/orders` ルートを作成しているため、フロントエンド側のURL変換が効いていない。`src/lib/api-client.ts` で `NEXT_PUBLIC_API_BASE_URL` 設定時に `/api/orders` が `/orders` に変換されることを確認し、Next.js開発サーバーを再起動する。

### `Internal Server Error`

Lambda内で例外が発生している。

対応:

```bash
aws logs tail /aws/lambda/oms-dev-order-api \
  --since 10m \
  --region ap-northeast-1 \
  --profile oms-dev
```

よくある原因:

- `ORDERS_TABLE_NAME` が未設定
- DynamoDB権限不足
- TypeScript/aliasがバンドルされていない
- API Gatewayイベントの `pathParameters` が想定と違う

### 画面から登録すると `500` になるが、Lambda単体は成功する

`aws lambda invoke` では `201` が返るのに、ブラウザの画面から注文登録すると `500` になる場合は、フロントエンドが古い API Gateway URL を参照している可能性が高い。

今回の典型例は次の状態だった。

- Lambda 直接実行は成功する
- `NEXT_PUBLIC_API_BASE_URL` が古い API Gateway ID を指している
- 画面は古い URL に `POST /orders` を送っている
- その結果、API Gateway 側で `500` になる

確認すること:

1. `.env.local` の `NEXT_PUBLIC_API_BASE_URL` が最新の API Gateway URL か確認する
2. URL を修正したら Next.js 開発サーバーを再起動する
3. ブラウザをハードリロードする
4. Network タブで実際の送信先が新しい URL になっているか確認する

例:

```env
NEXT_PUBLIC_API_BASE_URL=https://<api-id>.execute-api.ap-northeast-1.amazonaws.com
```

補足:

- `NEXT_PUBLIC_*` は起動時に読み込まれるため、`.env.local` を変更しただけでは反映されない
- 画面の送信先が `/api/orders` のままなら、`src/lib/api-client.ts` の URL 変換も確認する
- Lambda 単体が成功している場合は、アプリ本体ではなく API Gateway の接続先ずれを優先して疑う

### DynamoDBに保存されない

確認順:

1. LambdaログにDynamoDBエラーが出ていないか
2. Lambda実行ロールに対象テーブルの権限があるか
3. `ORDERS_TABLE_NAME` が `oms-dev-orders` か
4. 修正後のLambda zipを再デプロイしているか
5. AWSリージョンが `ap-northeast-1` か

## 13. 完了条件

STEP21完了条件:

- API Gateway URLが発行されている
- `GET /orders` がAPI Gateway経由で `200` を返す
- `POST /orders` がAPI Gateway経由で `201` を返す
- `PATCH /orders/{id}/status` が成功する
- CORS設定後、Next.jsのブラウザ画面から呼び出せる

STEP22完了条件:

- DynamoDBテーブル `oms-dev-orders` が存在する
- Lambda実行ロールがDynamoDBを読み書きできる
- 登録した注文がDynamoDBに保存される
- 詳細取得/一覧取得がDynamoDBから返る
- 削除後にDynamoDBから対象itemが消える

最終確認:

```bash
curl -i "$API_BASE_URL/orders"
aws dynamodb scan --table-name oms-dev-orders --limit 10 --region ap-northeast-1 --profile oms-dev
```

## 14. 後片付け

手動作成した場合は、不要になったリソースを削除する。

```bash
aws apigatewayv2 get-apis \
  --region ap-northeast-1 \
  --profile oms-dev

aws lambda delete-function \
  --function-name oms-dev-order-api \
  --region ap-northeast-1 \
  --profile oms-dev

aws dynamodb delete-table \
  --table-name oms-dev-orders \
  --region ap-northeast-1 \
  --profile oms-dev
```

IAMロール/ポリシーも不要なら削除する。

```bash
aws iam delete-role-policy \
  --role-name oms-dev-order-api-lambda-role \
  --policy-name oms-dev-order-api-dynamodb-policy \
  --profile oms-dev

aws iam detach-role-policy \
  --role-name oms-dev-order-api-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  --profile oms-dev

aws iam delete-role \
  --role-name oms-dev-order-api-lambda-role \
  --profile oms-dev
```

CDKで作った場合は、原則としてCDKで削除する。

```bash
npx aws-cdk destroy --profile oms-dev
```

## 15. 次の実装タスク

この手順を実コードに落とすときの順番:

1. DynamoDB Repositoryを追加する
2. Serviceから環境に応じてRepositoryを選べるようにする
3. CDKプロジェクトを追加する
4. DynamoDB TableをCDKで作る
5. Lambdaを `NodejsFunction` でバンドルする
6. HTTP APIをCDKで作る
7. `NEXT_PUBLIC_API_BASE_URL` をAPI Gateway URLに設定してNext.jsから疎通する
