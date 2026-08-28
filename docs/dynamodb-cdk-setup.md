# STEP26 DynamoDBをCDKで作成

このステップでは、注文データを保存する DynamoDB テーブルを CDK で作成する。

## 目的

- `oms-dev-orders` を CDK で再現可能にする
- Lambda から参照するテーブル名を固定する
- 後続の STEP27 以降で Lambda からそのテーブルへ接続できるようにする

## テーブル設計

最初は注文IDで1件取得できる単純な構成にする。

| 項目 | 値 |
| --- | --- |
| テーブル名 | `oms-dev-orders` |
| Partition key | `orderId` |
| Sort key | なし |
| 課金モード | On-demand |
| 削除ポリシー | `DESTROY` |

## CDK実装

`infra/lib/order-api-stack.js` に次を追加する。

```js
const dynamodb = require("aws-cdk-lib/aws-dynamodb");

const ordersTable = new dynamodb.Table(this, "OrdersTable", {
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  partitionKey: {
    name: "orderId",
    type: dynamodb.AttributeType.STRING,
  },
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  tableName: `oms-${stage}-orders`,
});
```

### 重要な判断

- 開発環境では `DESTROY` にして、不要時に削除しやすくする
- まずはアクセスパターンの核になる `orderId` だけで始める
- GSI は必要になってから足す

### 出力

デプロイ後に確認しやすいように、テーブル名とARNを Output する。

```js
new cdk.CfnOutput(this, "OrdersTableName", {
  value: ordersTable.tableName,
});

new cdk.CfnOutput(this, "OrdersTableArn", {
  value: ordersTable.tableArn,
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

開発アカウントへ反映する場合は、既存の bootstrap が前提になる。

```bash
npx aws-cdk deploy --profile oms-dev
```

## 確認

デプロイ後は次を確認する。

```bash
aws cloudformation describe-stacks \
  --stack-name OmsdevOrderApiStack \
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

- DynamoDB テーブルが CDK で作成される
- `oms-dev-orders` が Lambda の参照先として使える
- 次の STEP27 で Lambda を CDK 化できる

