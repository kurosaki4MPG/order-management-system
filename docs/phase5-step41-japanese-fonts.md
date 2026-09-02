# STEP41 日本語フォント対応

この手順は、PDF 帳票で日本語を安定して表示し、ブラウザ生成とサーバー生成の両方で同じフォントを使えるようにするための記録である。

## 実施内容

- 日本語フォントを PDF 生成時に埋め込むようにした
- ブラウザ生成では `public/fonts` の WOFF2 を参照するようにした
- サーバー生成ではローカルファイルパスの WOFF2 を参照するようにした
- 日本語、全角記号、かな、漢字、英数字が混在するサンプル文字列を用意した
- 今後の Lambda 生成で同じフォント設定を再利用できる形にした
- Node 側の React PDF では `Page` の継承だけに頼らず、各 `Text` へ明示的に `fontFamily` を付けるようにした

## 実装ファイル

- [`src/features/pdf/register-invoice-fonts.server.ts`](../src/features/pdf/register-invoice-fonts.server.ts)
- [`src/features/pdf/pdf-preview-panel.tsx`](../src/features/pdf/pdf-preview-panel.tsx)
- [`src/features/pdf/invoice-document.tsx`](../src/features/pdf/invoice-document.tsx)

## 確認方法

1. アプリを起動する
2. サイドバーの `帳票プレビュー` を開く
3. `請求書を生成` を押す
4. 日本語、全角記号、住所、備考が文字化けせず表示されることを確認する
5. 生成した PDF がダウンロードできることを確認する

## 確認観点

- ブラウザ表示で日本語が崩れない
- サーバー生成でも同じフォントを使える
- 文字種が増えてもレイアウトが破綻しにくい
- WOFF2 を使って転送サイズを抑えている
- `Page` 継承に依存せず、Node レンダリングでも日本語フォントが確実に選ばれる

## 完了条件

- 日本語フォントの利用方針が定まっている
- STEP42 でサーバー側 PDF 生成にそのまま進める
