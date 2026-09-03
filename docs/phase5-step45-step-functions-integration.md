# STEP45 Step Functionsとの統合

この手順は、注文処理ワークフローの最後で請求書 PDF を生成し、S3 保存と署名付き URL の発行までを一連の業務フローとして扱うための記録である。

## 実施内容

- Step Functions の終端に帳票生成タスクを追加する
- 請求書 PDF を生成して S3 に保存する
- 保存済み PDF への署名付き URL を返す
- ワークフローの実行結果に請求書情報を残す
- 請求書番号は注文 ID の末尾 8 桁と揃え、実行結果から同じ注文を追跡しやすくする

## 実装ファイル

- [`infra/lib/order-api-stack.js`](../infra/lib/order-api-stack.js)
- [`src/lambda/order-invoice-generation-handler.ts`](../src/lambda/order-invoice-generation-handler.ts)
- [`src/features/pdf/invoice-pdf.server.ts`](../src/features/pdf/invoice-pdf.server.ts)
- [`src/features/pdf/invoice-artifacts.server.ts`](../src/features/pdf/invoice-artifacts.server.ts)

## 確認方法

1. CDK をデプロイして `oms-<stage>-invoice-pdfs` バケットと workflow Lambda を作成する
2. `OrderCreated` を送って `oms-dev-order-processing-workflow` を起動する
3. 実行が `prepare` -> `finalize` -> `invoice` の順で進むことを確認する
4. 実行結果に `invoiceNumber`、`invoiceBucket`、`invoiceKey`、`invoiceSignedUrl` が含まれることを確認する
5. S3 コンソールで請求書 PDF が保存されていることを確認する

## 確認観点

- ワークフローの最後で帳票が生成される
- 生成した PDF がそのまま共有できる
- 失敗時は Step Functions の失敗として追える
- 帳票生成が注文処理の一部として扱える

## 完了条件

- Step Functions から請求書生成までつながっている
- 保存済み PDF と署名付き URL をワークフロー結果で確認できる
