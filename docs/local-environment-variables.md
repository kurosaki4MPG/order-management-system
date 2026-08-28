# ローカル環境変数ガイド

このドキュメントは、`next dev` やローカルの API 確認で必要な `.env.local` の項目をまとめたものです。

## 基本方針

- `.env.local` は Git 管理しない
- まずは `AWS_REGION` と `ORDERS_TABLE_NAME` を設定する
- PDF 保存や署名付き URL を試すなら `PDF_INVOICE_BUCKET_NAME` も設定する
- `NEXT_PUBLIC_API_BASE_URL` は API Gateway を直接叩くときだけ設定する

## 推奨サンプル

```env
AWS_REGION=ap-northeast-1
AWS_PROFILE=oms-dev
ORDERS_TABLE_NAME=oms-dev-orders
PDF_INVOICE_BUCKET_NAME=oms-dev-invoice-pdfs
NEXT_PUBLIC_API_BASE_URL=
```

## 必須項目

### `AWS_REGION`

- 役割: AWS SDK と CDK の既定リージョン
- 例: `ap-northeast-1`
- 備考: `AWS_DEFAULT_REGION` がある場合はそれも参照されるが、まず `AWS_REGION` を揃える

### `ORDERS_TABLE_NAME`

- 役割: 注文データを読む DynamoDB テーブル名
- 例: `oms-dev-orders`
- 備考: 現在の注文一覧・詳細・登録・更新・削除はこの値がないと動かない

## PDF 機能で必要な項目

### `PDF_INVOICE_BUCKET_NAME`

- 役割: 請求書 PDF の保存先 S3 バケット名
- 例: `oms-dev-invoice-pdfs`
- 備考: `/api/pdf/invoice/store` や署名付き URL 生成で使用する

### `PDF_INVOICE_AWS_REGION`

- 役割: PDF 保存先 S3 に使うリージョン
- 例: `ap-northeast-1`
- 備考: 未設定なら `AWS_REGION` を使う

## API 接続で必要な項目

### `NEXT_PUBLIC_API_BASE_URL`

- 役割: フロントエンドが API Gateway を直接呼ぶときのベース URL
- 例: `https://<api-id>.execute-api.ap-northeast-1.amazonaws.com`
- 備考: 未設定なら Next.js の同一オリジン `/api` を呼ぶ

## フェーズ別の追加項目

### `ORDER_EVENTS_BUS_NAME`

- 役割: 注文イベントを EventBridge に送るときの bus 名
- 使う場面: イベント駆動の確認をするとき

### `ORDER_NOTIFICATIONS_TOPIC_ARN`

- 役割: 注文通知を SNS に送るときの topic ARN
- 使う場面: 通知処理を確認するとき

## まず確認する順番

1. `AWS_REGION`
2. `ORDERS_TABLE_NAME`
3. `PDF_INVOICE_BUCKET_NAME`
4. `NEXT_PUBLIC_API_BASE_URL`

## 関連ドキュメント

- [`aws-development-environment-prep.md`](./aws-development-environment-prep.md)
- [`phase2-step21-22-implementation-guide.md`](./phase2-step21-22-implementation-guide.md)
- [`phase5-step43-s3-save.md`](./phase5-step43-s3-save.md)
