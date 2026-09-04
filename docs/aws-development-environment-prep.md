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

## LAN 共有する場合

LAN 共有では、Next.js を WSL 内で HTTP で起動し、Windows ホスト側で HTTPS の reverse proxy を立てる。
この構成にすると、ホスト PC からも他 PC からも同じ入口で確認しやすい。

### 手順

1. WSL 側で Next.js の standalone サーバーを起動する

```bash
npm run build
npm run start
```

2. Windows ホストで Caddy を起動する

```powershell
caddy run --config .\Caddyfile.lan
```

3. Windows ホストまたは LAN 内の別端末から `https://192.168.3.8:3443` を開く

### 注意点

- `Caddyfile.lan` は `https://192.168.3.8:3443` を HTTPS の入口にして、`127.0.0.1:3000` の WSL サーバーへ reverse proxy する
- `next build` の後に `postbuild` で `.next/static` と `public` を `standalone` 配下へコピーするため、画面崩れを防ぎやすい
- Caddy の `tls internal` は開発用の内部 CA を使うため、他 PC では CA を信頼しないと証明書警告が出る
- もし Caddy から WSL の `127.0.0.1:3000` に届かない場合は、`scripts/setup-wsl-portproxy.ps1` で Windows localhost から WSL へ中継する
- LAN 共有の確認では `NEXT_PUBLIC_API_BASE_URL` を外して same-origin `/api` に寄せると切り分けしやすい

## standalone での起動

`output: "standalone"` を使う場合、`next start` ではなく `node .next/standalone/server.js` を起動する。
この起動方式は基本的に HTTP であり、`next dev --experimental-https` のような HTTPS は提供しない。

### 起動例

```bash
npm run build
HOSTNAME=0.0.0.0 PORT=3000 npm run start
```

PowerShell の場合は次のようにする。

```powershell
npm run build
$env:HOSTNAME = "0.0.0.0"
$env:PORT = "3000"
npm run start
```

### 補足

- LAN 公開で HMR が不要なら、`dev` より `standalone + start` のほうが安定しやすい
- 起動後の直接アクセス先は `http://127.0.0.1:3000` になる
- 外部公開は `Caddyfile.lan` の reverse proxy を通して `https://192.168.3.8:3443` を使う
- Cognito の callback / logout を HTTPS のまま維持したい場合は、reverse proxy の公開 URL を登録する

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
