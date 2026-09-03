# Phase 5 React PDFによる帳票出力

対象STEP:
- STEP39 React PDF導入
- STEP40 請求書テンプレート
- STEP41 日本語フォント対応
- STEP42 PDF生成API
- STEP43 S3保存
- STEP44 署名付きURL
- STEP45 Step Functionsとの統合

## STEP39 React PDF導入

STEP39 の詳細実施手順は [phase5-step39-react-pdf.md](./phase5-step39-react-pdf.md) を参照する。

実施内容:
- ライブラリを導入する
- PDF の出力方法を確認する
- 注文データを元にした画面からの利用方針を決める

確認観点:
- 注文データから PDF を作成できる

完了条件:
- PDF生成の土台ができる

## STEP40 請求書テンプレート

STEP40 の詳細実施手順は [phase5-step40-invoice-template.md](./phase5-step40-invoice-template.md) を参照する。

実施内容:
- 請求書テンプレートのレイアウトを設計する
- ヘッダー、請求先、明細、備考、合計欄を作る
- 業務向けの見た目に整える

確認観点:
- 注文内容を帳票として読める

完了条件:
- 請求書の雛形ができる

## STEP41 日本語フォント対応

STEP41 の詳細実施手順は [phase5-step41-japanese-fonts.md](./phase5-step41-japanese-fonts.md) を参照する。

実施内容:
- 日本語フォントを用意する
- PDF 生成時にフォントを適用する
- ブラウザ生成とサーバー生成の両方で同じフォントを使う
- 文字化けを確認する

確認観点:
- 日本語が正しく出る

完了条件:
- 日本語帳票が安定して出せる

## STEP42 PDF生成API

STEP42 の詳細実施手順は [phase5-step42-pdf-api.md](./phase5-step42-pdf-api.md) を参照する。

実施内容:
- サーバー側で PDF を返す
- 入力値を検証する
- ダウンロードレスポンスを整える

確認観点:
- API から注文データを元にした PDF を取得できる

完了条件:
- 帳票APIができる

## STEP43 S3保存

STEP43 の詳細実施手順は [phase5-step43-s3-save.md](./phase5-step43-s3-save.md) を参照する。

実施内容:
- PDF を S3 に保存する
- 保存先キーを設計する
- 保存済みファイルを確認する

確認方法:
- `PDF_INVOICE_BUCKET_NAME` を設定する
- `/api/pdf/invoice/store` を開いて保存結果を確認する
- S3 コンソールで `orders/<orderId>/invoice-<invoiceNumber>.pdf` を確認する

確認観点:
- 帳票を後から参照できる

完了条件:
- PDF の永続保管ができる

## STEP44 署名付きURL

STEP44 の詳細実施手順は [phase5-step44-signed-url.md](./phase5-step44-signed-url.md) を参照する。

実施内容:
- 一時URLを発行する
- 有効期限を決める
- フロントエンドから取得する

確認方法:
- `PDF_INVOICE_BUCKET_NAME` を設定する
- `/api/pdf/invoice/signed-url` を開いて URL を確認する
- 発行された URL が有効期限内に PDF を開けることを確認する

確認観点:
- 安全にダウンロードできる

完了条件:
- 期限付きでPDFを配布できる

## STEP45 Step Functionsとの統合

STEP45 の詳細実施手順は [phase5-step45-step-functions-integration.md](./phase5-step45-step-functions-integration.md) を参照する。

実施内容:
- ワークフローに帳票生成を組み込む
- 生成成功/失敗を分ける
- 再実行の扱いを決める

確認方法:
- Step Functions の `prepare` / `finalize` の後に帳票生成が動く
- `invoiceBucket` と `invoiceKey` が実行結果に残る
- 署名付き URL が出力される

確認観点:
- 注文処理の一部として請求書が生成される

完了条件:
- 帳票処理がワークフローに統合される

## 関連資料

- [phase5-step39-react-pdf.md](./phase5-step39-react-pdf.md)
- [phase5-step40-invoice-template.md](./phase5-step40-invoice-template.md)
- [phase5-step41-japanese-fonts.md](./phase5-step41-japanese-fonts.md)
- [phase5-step42-pdf-api.md](./phase5-step42-pdf-api.md)
- [phase5-step43-s3-save.md](./phase5-step43-s3-save.md)
- [phase5-step44-signed-url.md](./phase5-step44-signed-url.md)
- [phase5-step45-step-functions-integration.md](./phase5-step45-step-functions-integration.md)

## まとめ

- 帳票出力は `react-pdf` のテンプレートを土台に、プレビュー・API・S3 保存・署名付き URL を同じ請求書データから扱う構成にした
- 請求書番号は注文 ID の末尾 8 桁と揃えることで、一覧・詳細・帳票・保存先キーの対応を追いやすくした
- 日本語フォント、サーバー側 PDF 生成、S3 保存、Step Functions 連携を順に追加し、注文処理の後段として請求書を生成できるようにした
- 詳細な実装と確認手順は各 STEP の詳細手順書に分けて記録している
