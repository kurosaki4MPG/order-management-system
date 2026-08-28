# STEP42 PDF生成API

この手順は、React PDF のテンプレートをサーバー側で生成し、HTTP 経由で PDF を返す API を用意するための記録である。

## 実施内容

- `GET /api/pdf/invoice` で PDF を返す Route Handler を追加する
- サーバー側で注文データを読み込み、`renderToBuffer` を使って PDF を生成する
- 日本語フォントをサーバー環境でも読み込む
- `orderId` などのクエリパラメータを検証し、不正な入力は 400 にする
- ブラウザからそのまま開ける確認導線を追加する

## 実装ファイル

- [`src/app/api/pdf/invoice/route.ts`](../src/app/api/pdf/invoice/route.ts)
- [`src/features/pdf/invoice-order.server.ts`](../src/features/pdf/invoice-order.server.ts)
- [`src/features/pdf/register-invoice-fonts.server.ts`](../src/features/pdf/register-invoice-fonts.server.ts)
- [`src/app/pdf-preview/page.tsx`](../src/app/pdf-preview/page.tsx)

## 確認方法

1. アプリを起動する
2. サイドバーの `帳票プレビュー` を開く
3. 対象注文を選ぶ
4. プレビュー枠に選択中の注文から生成した PDF が表示されることを確認する
5. `更新` で再取得できることを確認する
6. `PDF を開く` で直接 URL を開けることを確認する
7. プレビュー更新時は `preview` クエリが変わり、同じ注文の PDF を再生成することを確認する

## 入力の確認

次のようなクエリで一部値を上書きできる。

```text
/api/pdf/invoice?orderId=ORD-20260804-001
```

不正な空文字や未定義値が混ざる場合は、API が 400 を返す。

## 確認観点

- サーバー側で PDF を生成できる
- 画面からも注文データを元に直接開いて確認できる
- 入力検証が通ってから描画される
- `preview` クエリで再生成を確認できる
- STEP43 の S3 保存へつなげられる

## 完了条件

- PDF を API 経由で返せる
- STEP43 で保存処理を追加できる土台ができる
