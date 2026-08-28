# STEP30 CDKデプロイ

このステップでは、CDK で作成した `dev` / `prod` 環境を実際にデプロイする手順を整理する。

## 目的

- `stage` ごとに分かれた CDK スタックを反映する
- dev から先に安全にデプロイする
- prod は CORS と削除ポリシーを確認してから反映する

## 前提

- `aws configure sso` で `oms-dev` などのプロファイルが作成済み
- `CDKToolkit` の bootstrap が完了済み
- `infra/bin/app.js` と `infra/lib/order-api-stack.js` の synth が通る
- `stage` と `corsOrigins` の環境分離が実装済み

## デプロイ順序

### 1. dev をデプロイする

```bash
npx aws-cdk deploy \
  -c stage=dev \
  --profile oms-dev
```

dev では次の値になる。

- スタック名: `OmsdevOrderApiStack`
- テーブル名: `oms-dev-orders`
- Lambda 名: `oms-dev-order-api`
- API 名: `oms-dev-order-api`
- DynamoDB 削除ポリシー: `DESTROY`
- CORS: `http://localhost:3000`

### 2. prod をデプロイする

```bash
npx aws-cdk deploy \
  -c stage=prod \
  -c corsOrigins=https://app.example.com \
  --profile oms-prod
```

prod では必ず `corsOrigins` を指定する。

- スタック名: `OmsprodOrderApiStack`
- テーブル名: `oms-prod-orders`
- Lambda 名: `oms-prod-order-api`
- API 名: `oms-prod-order-api`
- DynamoDB 削除ポリシー: `RETAIN`
- CORS: 本番フロントエンド URL

## 実行前の確認

### synth

```bash
npx aws-cdk synth -c stage=dev
npx aws-cdk synth -c stage=prod -c corsOrigins=https://app.example.com
```

### diff

```bash
npx aws-cdk diff -c stage=dev --profile oms-dev
npx aws-cdk diff -c stage=prod -c corsOrigins=https://app.example.com --profile oms-prod
```

## このリポジトリでの実行上の注意

この環境では `npx aws-cdk` がネットワーク経由で CLI を取得できない場合がある。

その場合は、すでに残っているローカルキャッシュの CLI を使う。

```bash
node /home/kurosaki/.npm/_npx/fa14b75510cd2922/node_modules/aws-cdk/bin/cdk deploy \
  -c stage=dev \
  --profile oms-dev
```

必要なら同じ要領で `synth` / `diff` も実行できる。

## デプロイ後の確認

```bash
npx aws-cdk output -c stage=dev --profile oms-dev
```

確認したい代表項目:

- `OrderApiUrl`
- `OrdersTableName`
- `OrderApiFunctionName`
- `Stage`

## トラブルシュート

- `No AWS accounts are available to you`
  - SSO ログイン先のアカウント割り当てを確認する
- `Token has expired and refresh failed`
  - `aws sso login --profile oms-dev` を再実行する
- `AccessDenied` が出る
  - IAM 権限と Permission Set を見直す
- `npx aws-cdk` が失敗する
  - ローカルキャッシュの CLI か、事前に導入済みの `aws-cdk` を使う

## 関連ファイル

- `infra/bin/app.js`
- `infra/lib/order-api-stack.js`
- `docs/cdk-environment-separation.md`

