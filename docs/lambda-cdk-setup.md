# STEP27 LambdaをCDKで作成

このステップでは、注文APIの Lambda 関数を CDK で作成する。

## 目的

- `src/lambda/order-api-gateway-handler.ts` を CDK からデプロイ可能にする
- `oms-dev-order-api` を固定名で作成する
- DynamoDB テーブル `oms-dev-orders` と接続する

## 実装方針

Lambda は `NodejsFunction` で作る。

理由:

- TypeScript のままバンドルしやすい
- `@/` import alias をまとめて解決しやすい
- 依存パッケージを手作業で zip に固める必要がない

## CDK実装

`infra/lib/order-api-stack.js` に次を追加する。

```js
const lambda = require("aws-cdk-lib/aws-lambda");
const lambdaNodejs = require("aws-cdk-lib/aws-lambda-nodejs");
const path = require("path");

const orderApiFunction = new lambdaNodejs.NodejsFunction(
  this,
  "OrderApiFunction",
  {
    entry: path.join(__dirname, "../../src/lambda/order-api-gateway-handler.ts"),
    environment: {
      ORDERS_TABLE_NAME: ordersTable.tableName,
    },
    functionName: `oms-${stage}-order-api`,
    handler: "handler",
    runtime: lambda.Runtime.NODEJS_22_X,
    timeout: cdk.Duration.seconds(10),
  }
);
```

### 権限

Lambda には DynamoDB の読み書き権限を付ける。

```js
ordersTable.grantReadWriteData(orderApiFunction);
```

### 出力

デプロイ後に確認しやすいよう、関数名とARNを Output する。

```js
new cdk.CfnOutput(this, "OrderApiFunctionName", {
  value: orderApiFunction.functionName,
});

new cdk.CfnOutput(this, "OrderApiFunctionArn", {
  value: orderApiFunction.functionArn,
});
```

## 実行確認

### 合成

```bash
npx aws-cdk synth
```

### 差分

```bash
npx aws-cdk diff
```

## デプロイ

```bash
npx aws-cdk deploy --profile oms-dev
```

## 確認

デプロイ後は次を確認する。

```bash
aws lambda get-function \
  --function-name oms-dev-order-api \
  --region ap-northeast-1 \
  --profile oms-dev
```

```bash
aws lambda get-function-configuration \
  --function-name oms-dev-order-api \
  --region ap-northeast-1 \
  --profile oms-dev
```

```bash
aws dynamodb describe-table \
  --table-name oms-dev-orders \
  --region ap-northeast-1 \
  --profile oms-dev
```

## このステップの到達点

- Lambda 関数が CDK から作成される
- `oms-dev-order-api` が DynamoDB に接続できる
- 次の STEP28 で API Gateway を CDK 化できる

