# Phase 3 AWS CDKによるIaC

対象STEP:
- STEP25 CDKプロジェクト作成
- STEP26 DynamoDBをCDKで作成
- STEP27 LambdaをCDKで作成
- STEP28 API GatewayをCDKで作成
- STEP29 環境分離
- STEP30 CDKデプロイ

STEP25 の詳細実施手順は [phase3-step25-cdk-project-setup.md](./phase3-step25-cdk-project-setup.md) を参照する。

## STEP25 CDKプロジェクト作成

実施内容:
- CDK の入口を作る
- `cdk.json` を設定する
- `infra/bin/app.js` と `infra/lib/` を用意する

確認観点:
- `synth` できる最小構成になっている

完了条件:
- CDK の土台ができている

## STEP26 DynamoDBをCDKで作成

実施内容:
- テーブルを定義する
- PK を `orderId` にする
- `PAY_PER_REQUEST` を使う
- 出力を追加する

確認観点:
- テーブル名とARNが見える

完了条件:
- CDK で DynamoDB を作成できる

## STEP27 LambdaをCDKで作成

実施内容:
- `NodejsFunction` を使う
- TypeScript をバンドルする
- DynamoDB への権限を付与する

確認観点:
- Lambda がテーブルを読める

完了条件:
- CDK から Lambda を作成できる

## STEP28 API GatewayをCDKで作成

実施内容:
- HTTP API を作る
- ルートを追加する
- CORS を設定する

確認観点:
- `/orders` 系にルーティングできる

完了条件:
- API Gateway と Lambda がつながる

## STEP29 環境分離

実施内容:
- `stage` を context から読む
- dev と prod で命名を分ける
- CORS と削除ポリシーを分ける

確認観点:
- prod で誤って `DESTROY` しない

完了条件:
- 環境差分を安全に持てる

## STEP30 CDKデプロイ

実施内容:
- dev をデプロイする
- diff で差分を確認する
- prod をデプロイする
- 出力値を確認する

確認観点:
- どのリソースが作成されたか追える

完了条件:
- 実AWSへ反映できる
