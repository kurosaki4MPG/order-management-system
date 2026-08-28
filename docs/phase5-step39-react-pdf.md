# STEP39 React PDF導入

この手順は、Phase 5 の最初の作業として PDF 帳票の確認導線を導入し、注文データを元にしたプレビューとダウンロードを確認できる状態を作るための記録である。

## 実施内容

- `@react-pdf/renderer` を導入した
- `Document` / `Page` / `View` / `Text` を使う PDF テンプレートを作った
- ブラウザの標準 PDF ビューアで確認できる `/pdf-preview` 画面を追加した
- 画面内の更新ボタンで選択中の注文の `/api/pdf/invoice` を再読み込みする方式にした
- サイドバーから帳票プレビューへ移動できる導線を追加した

## 実装ファイル

- [`src/features/pdf/invoice-document.tsx`](../src/features/pdf/invoice-document.tsx)
- [`src/app/pdf-preview/page.tsx`](../src/app/pdf-preview/page.tsx)
- [`src/components/layouts/app-sidebar.tsx`](../src/components/layouts/app-sidebar.tsx)

## 確認方法

1. アプリを起動する
2. サイドバーの `帳票プレビュー` を開く
3. 対象注文を選ぶ
4. `プレビューを更新` を押す
5. PDF が画面内の埋め込みビューアに表示されることを確認する
6. `PDF を開く` で別タブ表示できることを確認する

## 確認観点

- 画面遷移が重くならない
- ボタン操作で選択中の注文の PDF が再取得される
- ダウンロードリンクが動作する
- 注文データをそのまま帳票へ反映できる

## 完了条件

- React PDF の導入が完了している
- PDF の生成と表示方法が注文データと連動して確認できている
- STEP40 以降の帳票設計に進める土台ができている
