# STEP16 AWS開発環境準備

このプロジェクトでは、Phase 2 以降の AWS サーバーレス実装に入る前に、ローカル開発で必要な前提をそろえる。

## 目的

- AWS へ接続できる開発用プロファイルを準備する
- CDK を実行できる状態にする
- バックエンド実装時の環境変数の置き場を決める
- フロントエンドから後続の API Gateway に接続しやすい形にする

## 前提ツール

- Node.js
- npm
- Git
- AWS CLI v2
- AWS CDK v2

## 推奨する初期設定

1. 開発用の AWS アカウントを 1 つ用意する
2. IAM ユーザーまたは IAM Identity Center の開発用アクセスを用意する
3. AWS CLI のプロファイルを作成する

```bash
aws configure --profile oms-dev
aws sts get-caller-identity --profile oms-dev
```

4. CDK が利用できることを確認する

```bash
npx aws-cdk --version
```

5. 後続の CDK デプロイに備えて bootstrap を実施する

```bash
npx aws-cdk bootstrap aws://<account-id>/ap-northeast-1 --profile oms-dev
```

## ローカル環境変数

この段階では本番用の秘密情報は持たない。設定値は `.env.local` に置く。

最小構成は次の通り。

```env
AWS_REGION=ap-northeast-1
AWS_PROFILE=oms-dev
ORDERS_TABLE_NAME=oms-dev-orders
PDF_INVOICE_BUCKET_NAME=oms-dev-invoice-pdfs
NEXT_PUBLIC_API_BASE_URL=
```

- `AWS_REGION` は CDK と AWS SDK の既定リージョンとして利用する
- `AWS_PROFILE` はローカル実行時の参照先を固定する
- `ORDERS_TABLE_NAME` は注文系 API の必須設定
- `PDF_INVOICE_BUCKET_NAME` は PDF 保存と署名付き URL で必要
- `NEXT_PUBLIC_API_BASE_URL` は Phase 2 後半で API Gateway の URL に切り替える。未設定なら同一オリジンの `/api` を使う

## 開発時の確認ポイント

- `aws sts get-caller-identity` で想定アカウントに接続できる
- `npx aws-cdk --version` が動作する
- `npx aws-cdk bootstrap` を実行できる権限がある
- `.env.local` が Git 管理されていない

## 追加の環境変数

後続ステップでイベント駆動や通知を確認するときは、次の値も使う。

- `ORDER_EVENTS_BUS_NAME`
- `ORDER_NOTIFICATIONS_TOPIC_ARN`
- `PDF_INVOICE_AWS_REGION`

詳細は [`local-environment-variables.md`](./local-environment-variables.md) を参照する。

## 後続ステップとの関係

- STEP18 以降で Lambda / API Gateway / DynamoDB を追加する
- STEP24 で Next.js から AWS API へ接続する
- STEP25 以降で CDK による IaC を組み立てる
