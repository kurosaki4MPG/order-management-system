# LAN 共有エクストラ設定

このファイルは、`order-management-system` を WSL + Windows で LAN 共有するための追加設定だけをまとめたものです。
LAN 共有に関する起動手順と補足を、このファイルに集約します。

## 目的

- WSL 上の Next.js を Windows ホスト経由で LAN 共有する
- ホスト PC と他 PC の両方から同じ URL でアクセスできるようにする
- Cognito の認証導線を LAN 公開 URL に一致させる
- `output: "standalone"` の静的資産欠落を避ける

## 最終構成

- Next.js 本体は WSL で起動する
- Windows 側で reverse proxy を起動する
- ブラウザは Windows 側の HTTPS 入口にアクセスする
- Cognito はその公開 URL を callback / logout に使う

### 構成図

```text
Browser
  -> https://192.168.3.8:3443
  -> Windows Caddy
  -> http://127.0.0.1:3000
  -> WSL Next.js dev server
```

## 使うファイル

- [`.env.local`](../.env.local)
- [`package.json`](../package.json)
- [`next.config.ts`](../next.config.ts)
- [`Caddyfile.lan`](../Caddyfile.lan)
- [`scripts/start-standalone.mjs`](../scripts/start-standalone.mjs)
- [`scripts/copy-standalone-assets.mjs`](../scripts/copy-standalone-assets.mjs)
- [`scripts/setup-wsl-portproxy.ps1`](../scripts/setup-wsl-portproxy.ps1)

## `.env.local`

LAN 公開時は次の値を使う。

```env
AWS_REGION=ap-northeast-1
AWS_PROFILE=oms-dev
ORDERS_TABLE_NAME=oms-dev-orders
PDF_INVOICE_BUCKET_NAME=oms-dev-invoice-pdfs
COGNITO_USER_POOL_ID=ap-northeast-1_eAkW18T0X
COGNITO_USER_POOL_CLIENT_ID=3o1bc01tvqqujdd420eptdmuei
COGNITO_DOMAIN_BASE_URL=https://oms-dev-order-auth-686910912663.auth.ap-northeast-1.amazoncognito.com
COGNITO_REDIRECT_URI=https://192.168.3.8:3443/api/auth/callback
COGNITO_LOGOUT_URI=https://192.168.3.8:3443/login
```

### 方針

- `NEXT_PUBLIC_API_BASE_URL` は使わない
- フロントエンドは same-origin の `/api` を使う
- Cognito の callback / logout は `https://192.168.3.8:3443` に完全一致させる
- `dev:lan` は Node ラッパーで `LAN_SHARE=1` を付けて起動する
- `dev:lan` は reverse proxy との相性を優先して webpack を使う
- `allowedDevOrigins` は LAN の公開ホスト `192.168.3.8` を許可する

## 起動手順

このファイルで説明する LAN 共有の通常運用は `npm run dev:lan` で起動する。
`build:lan` / `start:lan` は standalone 出力の確認用であり、ライブ更新ありの LAN 共有では使わない。

### 1. WSL の IP を Windows 側へ向ける

WSL の IP が変わったとき、または初回起動前に、管理者権限の PowerShell で portproxy を設定する。

```powershell
.\scripts\setup-wsl-portproxy.ps1
```

### 2. Windows 側で Caddy を起動する

別の PowerShell を開き、リポジトリ直下で Caddy を起動する。

```powershell
c:\tools\caddy\caddy run --config .\Caddyfile.lan
```

### 3. WSL 側で Next.js の LAN 共有用 dev を起動する

WSL 側のリポジトリ直下で次を実行する。

```bash
npm run dev:lan
```

### 4. ブラウザで公開 URL にアクセスする

ホスト PC でも他 PC でも、`https://192.168.3.8:3443` を開く。

## Next.js 起動

通常の LAN 共有では `dev:lan` で Next dev server を起動する。
`output: "standalone"` を確認する場合だけ `build:lan` と `start:lan` を使う。

### `package.json`

ローカル起動は元の `build` / `start` を保ち、LAN 共有用だけ別スクリプトに分ける。
`start` は既存のローカル向け設定として残しているが、この LAN 共有フローでは使わない。

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:lan": "node scripts/dev-lan.mjs",
    "build": "next build",
    "build:lan": "next build && node scripts/copy-standalone-assets.mjs",
    "start": "next start",
    "start:lan": "node scripts/start-standalone.mjs"
  }
}
```

### 起動ラッパー

`scripts/start-standalone.mjs` は次の役割を持つ。

- `.env.local` を読み込む
- `.next/standalone/server.js` を起動する

### 開発時の使い分け

```bash
# 通常のローカル開発
npm run dev

# LAN 共有用の dev
npm run dev:lan

# standalone の確認用
npm run build:lan
npm run start:lan
```

## 静的資産コピー

standalone 出力は、`public` と `.next/static` を自動では含まない。
そのため `build:lan` の後続処理で次のコピーを行う。
`dev:lan` では standalone 出力を使わないため、このコピーは不要。

- `public` -> `.next/standalone/public`
- `.next/static` -> `.next/standalone/.next/static`

### `package.json`

`build:lan` の中でコピーを実行する。

## reverse proxy

Windows 側で Caddy を起動し、`https://192.168.3.8:3443` を入口にする。

### `Caddyfile.lan`

```caddyfile
{
	admin off
	auto_https disable_redirects
}

https://192.168.3.8:3443 {
	tls internal
	reverse_proxy 127.0.0.1:3000 {
		header_up Host {host}
		header_up X-Forwarded-Host {host}
		header_up X-Forwarded-Proto {scheme}
	}
}
```

### 意味

- `admin off`
  - Caddy の管理ポートを使わない
- `auto_https disable_redirects`
  - `:80` を使う自動リダイレクトを止める
- `tls internal`
  - 開発用の内部 CA を使う
- `reverse_proxy 127.0.0.1:3000`
  - WSL の Next.js dev server へ転送する
- `header_up Host {host}`
  - Next dev に外側のホスト名を渡す
- `header_up X-Forwarded-Host {host}`
  - 外側のホスト名をアプリ側へ渡す
- `header_up X-Forwarded-Proto {scheme}`
  - HTTPS であることをアプリ側へ渡す

### Windows 側の起動

まず `scripts/setup-wsl-portproxy.ps1` を管理者 PowerShell で実行して、Windows の `127.0.0.1:3000` を WSL 側へ転送できるようにする。
その後、通常の PowerShell で Caddy を起動する。

```powershell
c:\tools\caddy\caddy run --config .\Caddyfile.lan
```

## アクセス URL

- ホスト PC
  - `https://192.168.3.8:3443`
- 他 PC
  - `https://192.168.3.8:3443`

## 確認項目

1. ホスト PC から `https://192.168.3.8:3443` が開ける
2. 他 PC からも同じ URL で開ける
3. ログイン画面が表示される
4. Cognito 認証後に `/orders` へ戻れる
5. `/pdf-preview` で画面崩れがない

## うまくいかないとき

### 1. Caddy が起動しない

- 既に別プロセスが 3443 を使っていないか確認する
- `Caddyfile.lan` の内容を再確認する

### 2. Cognito エラーになる

- callback / logout URL が `https://192.168.3.8:3443` と一致しているか確認する
- Cognito の app client 設定を見直す

### 3. 画面が崩れる

- `npm run build:lan` 後に standalone 配下へ静的資産がコピーされているか確認する
- `public` と `.next/static` が standalone 配下へコピーされているか確認する

### 4. 他 PC で証明書警告が出る

- `tls internal` の内部 CA を信頼していない可能性がある
- 必要なら各 PC で証明書を信頼する

## 補足

- この設定は通常の開発手順ではなく、LAN 共有のための追加設定として扱う
- 既存の `docs` は変更せず、このファイルだけを参照すればよい
- ライブ更新ありの LAN 共有は `npm run dev:lan` を使う
- `npm run build:lan` / `npm run start:lan` は standalone の確認用である
