# STEP44 署名付きURL

この手順は、S3 に保存した請求書 PDF へ一時的にアクセスできる署名付き URL を発行するための記録である。

## 実施内容

- 署名付き URL を返す Route Handler を追加する
- 既存の PDF 生成と S3 保存を組み合わせて、配布用 URL を発行する
- 有効期限を固定し、使い方を単純にする
- 未設定時は明確に 503 を返す

## 実装ファイル

- [`src/app/api/pdf/invoice/signed-url/route.ts`](../src/app/api/pdf/invoice/signed-url/route.ts)
- [`src/features/pdf/invoice-artifacts.server.ts`](../src/features/pdf/invoice-artifacts.server.ts)
- [`src/app/pdf-preview/page.tsx`](../src/app/pdf-preview/page.tsx)

## 確認方法

1. `PDF_INVOICE_BUCKET_NAME` を環境変数に設定する
2. アプリを起動する
3. `http://localhost:3000/api/pdf/invoice/signed-url` を開く
4. JSON で `signedUrl` が返ることを確認する
5. 返却された URL が有効期限内に PDF を開けることを確認する

## 確認観点

- 一時URLで PDF を配布できる
- URL の有効期限が明示されている
- 保存済み PDF への安全な導線になる
- STEP45 でワークフローから利用しやすい

## 完了条件

- 署名付き URL の発行導線ができている
- 帳票の共有方法が揃っている
