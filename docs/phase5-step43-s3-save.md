# STEP43 S3保存

この手順は、生成した請求書 PDF を S3 に保存し、後から参照できる状態を作るための記録である。

## 実施内容

- PDF を S3 に保存する Route Handler を追加する
- 保存キーを `orders/<orderId>/invoice-<invoiceNumber>.pdf` に統一する
- `invoiceNumber` は `orderId` の末尾 8 桁と揃うため、保存キーでも注文と請求書の対応が追いやすい
- 保存結果を JSON で確認できるようにする
- S3 未設定時は明確に 503 を返す

## 実装ファイル

- [`src/app/api/pdf/invoice/store/route.ts`](../src/app/api/pdf/invoice/store/route.ts)
- [`src/features/pdf/invoice-artifacts.server.ts`](../src/features/pdf/invoice-artifacts.server.ts)
- [`src/app/pdf-preview/page.tsx`](../src/app/pdf-preview/page.tsx)

## 確認方法

1. `PDF_INVOICE_BUCKET_NAME` を環境変数に設定する
2. アプリを起動する
3. `http://localhost:3000/api/pdf/invoice/store` を開く
4. JSON で `bucket` と `key` が返ることを確認する
5. S3 コンソールで `orders/<orderId>/invoice-<invoiceNumber>.pdf` が保存されていることを確認する

## 確認観点

- PDF が S3 に保存される
- 保存先キーが一意で分かりやすい
- 未設定時のエラーが分かりやすい
- 後続の署名付き URL 生成へつなげられる

## 完了条件

- PDF の保存導線ができている
- STEP44 で署名付き URL を発行できる
