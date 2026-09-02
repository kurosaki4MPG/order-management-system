# STEP77 負荷・障害試験

## 1. 目的

注文管理システムに対して、軽い負荷と意図的な障害を与えたときの挙動を確認する。  
特に、画面の応答性、Step Functions / SQS / DLQ / Lambda の失敗再現、復旧後のアラーム戻りを確認し、運用時に迷わない手順として整理する。

---

## 2. 前提条件

- STEP74, STEP75, STEP76 が完了している
- AWS コンソールで CloudWatch, Step Functions, SQS, DLQ, Lambda, Cognito, S3 を確認できる
- 画面確認をする場合は `npm run dev` で Next.js を起動できる
- 失敗確認に使う注文 ID / イベント ID を決めておく

---

## 3. 負荷確認

### 3.1 画面の軽い負荷確認

対象画面:

- `/orders`
- `/orders/new`
- `/orders/[id]`
- `/pdf-preview`

確認すること:

- 一覧表示から詳細表示への遷移が極端に遅くならない
- 連続で画面を切り替えても表示が壊れない
- PDF プレビューの再描画を繰り返しても操作不能にならない

手順:

1. `/orders` を開く
2. 一覧と詳細を数回切り替える
3. `/orders/new` を開いて入力欄の表示を確認する
4. `/pdf-preview` を開いてプレビューの更新を複数回押す
5. 必要に応じて Chrome DevTools の Performance で描画時間を確認する

確認結果として残す内容:

- どの画面で遅さを感じたか
- 何回目の再描画で重さが出たか
- ブラウザの再読み込みで復帰したか

### 3.2 API の軽い負荷確認

対象 API:

- `GET /api/orders`
- `GET /api/orders/[id]`
- `POST /api/orders`
- `GET /api/pdf/invoice`

確認すること:

- 通常入力で連続呼び出ししても 5xx が出ない
- エラー応答が返る場合でも、原因がログで追える
- PDF 出力が連続実行で破綻しない

---

## 4. 意図的な障害確認

### 4.1 Step Functions の失敗確認

対象:

- `PrepareOrderWorkflowTask`
- `FinalizeOrderWorkflowTask`
- `GenerateInvoiceWorkflowTask`

使う入力例:

```json
{
  "workflow": "order-processing",
  "detailType": "OrderCreated",
  "orderId": "ORD-TEST-001",
  "eventId": "evt-test-001",
  "shouldFail": true
}
```

請求書生成だけ失敗させる場合:

```json
{
  "workflow": "order-processing",
  "detailType": "OrderCreated",
  "orderId": "ORD-TEST-001",
  "eventId": "evt-test-001",
  "shouldFail": false,
  "shouldFailInvoice": true
}
```

確認すること:

- 実行履歴でどの Task が失敗したか分かる
- `ExecutionFailed` / `States.Runtime` の違いを把握できる
- 失敗入力を止めれば再実行で成功する

### 4.2 SQS / DLQ の失敗確認

対象:

- `oms-dev-order-processing-queue`
- `oms-dev-order-processing-dlq`

手順:

1. 正常形式ではないメッセージを `order-processing-queue` に送る
2. Consumer 側で例外が出ることを確認する
3. `maxReceiveCount = 3` に達したら DLQ に移ることを確認する
4. `oms-dev-order-processing-dlq` の利用可能メッセージを確認する

確認すること:

- どのメッセージが DLQ に落ちたか分かる
- Consumer の失敗ログと DLQ の件数が一致する
- DLQ を空にしたあとにアラームが戻る

### 4.3 Lambda の失敗確認

対象:

- Order Workflow Task Lambda
- Invoice Generation Lambda
- Queue Consumer Lambda

確認すること:

- Lambda のログに失敗理由が残る
- CloudWatch Alarm が該当サービスで上がる
- 失敗を止めると次の実行で戻る

---

## 5. 復旧確認

### 5.1 復旧の基本手順

1. 障害の原因入力を止める
2. DLQ に残ったメッセージを確認する
3. 必要であれば正常メッセージで再実行する
4. Lambda / Step Functions / SQS の状態を見直す
5. CloudWatch Alarm が `OK` に戻るまで待つ

### 5.2 復旧時に確認する観点

- 同じ注文 ID で再実行したときに成功するか
- DLQ の件数が減るか
- `PrepareOrderWorkflowTask` / `GenerateInvoiceWorkflowTask` / `OrderWorkflowFailed` などの状態が期待どおりか
- アラームが自動で解除されるか

---

## 6. 運用確認の観点

- どの障害を見ればどのサービスに辿り着けるか
- CloudWatch Logs / Alarm / Step Functions / SQS の見方を説明できるか
- 再現した障害を、再デプロイ・再実行・手動回復のどれで戻すか判断できるか
- 画面の遅さとバックエンド障害を切り分けられるか

## 7. AWS 実地確認手順

### 7.1 CloudWatch アラーム

1. AWS コンソールで `CloudWatch` を開く
2. `Alarms` を開き、`oms-dev-` で始まるアラームを確認する
3. `oms-dev-order-processing-dlq-alarm`、`oms-dev-order-queue-consumer-error-alarm`、`oms-dev-order-invoice-generation-error-alarm`、`oms-dev-order-processing-workflow-failed-alarm` の状態を見る
4. 必要に応じて `Metrics` で `AWS/SQS`、`AWS/Lambda`、`AWS/States` のメトリクスを見る
5. 障害を止めたあと、状態が `OK` に戻るまで待つ

### 7.2 Step Functions

1. AWS コンソールで `Step Functions` を開く
2. `oms-dev-order-processing-workflow` を開く
3. `Start execution` を押して、正常系と失敗系の JSON をそれぞれ流す
4. `PrepareOrderWorkflowTask`、`FinalizeOrderWorkflowTask`、`GenerateInvoiceWorkflowTask` のどこで止まるかを見る
5. `Executions` の履歴と CloudWatch Logs の `requestId` / `eventId` / `orderId` を突き合わせる

実機確認メモ:

- `shouldFail: true` を含む入力で実行したところ、実行 ARN `arn:aws:states:ap-northeast-1:686910912663:execution:oms-dev-order-processing-workflow:oms-dev-order-processing-workflow-failure-20260902015129` が作成された
- 実行状態は `FAILED` となり、`error = OrderWorkflowFailed`、`cause = The order workflow task reported an error` を確認した
- `oms-dev-order-processing-workflow-failed-alarm` は 5 分評価後に `OK` から `ALARM` へ遷移した
- アラーム遷移は即時ではなく、`AWS/States` の `ExecutionsFailed` メトリクスの評価周期に依存する

### 7.3 SQS / DLQ

1. AWS コンソールで `SQS` を開く
2. `oms-dev-order-processing-queue` と `oms-dev-order-processing-dlq` を開く
3. 失敗させたいメッセージを送る
4. `ApproximateNumberOfMessagesVisible`、`maxReceiveCount = 3`、DLQ の件数を確認する
5. DLQ を空にしたあと、アラームが `OK` に戻るかを確認する

実機確認メモ:

- `not-json` のメッセージを `oms-dev-order-processing-queue` に投入し、Consumer が 1 回目の受信で `InFlight = 1` になったことを確認した
- 再試行後に DLQ へ移送され、`oms-dev-order-processing-dlq` の `Visible = 1` を確認した
- `oms-dev-order-processing-dlq-alarm` と `oms-dev-order-queue-consumer-error-alarm` は `ALARM` へ遷移した
- DLQ を purge し、正常形式の EventBridge メッセージを 1 件流したあと、両アラームが `OK` に戻った
- 最終的に `oms-dev-order-processing-workflow-failed-alarm` も含め、今回確認した 3 つのアラームはすべて `OK` であることを確認した

### 7.4 CloudWatch Logs

1. `CloudWatch Logs` を開く
2. `requestId`、`eventId`、`orderId`、`workflow` で追う
3. `Start execution` した Step Functions の実行と Lambda ログを突き合わせる
4. 失敗原因と復旧後の成功ログを対で残す

---

## 8. 完了条件

- 軽い負荷をかけたときの画面挙動を確認できた
- Step Functions、SQS / DLQ、Lambda の失敗を意図的に再現できた
- DLQ とアラームの復旧手順を説明できた
- 障害確認後に正常系へ戻せた

---

## 9. 実施メモ

- 失敗確認は、実際に送った JSON と実行履歴を対で残す
- アラーム確認は、発火条件・解除条件・確認タイミングを分けて記録する
- 画面確認は、見た目ではなく応答時間と操作可否を優先して記録する
- 2026-09-02 に Playwright を使って実機確認を実施した
- 認証は E2E 実行時のみ通るようにし、proxy とサーバー側の両方で検証を成立させた
- 注文登録フォームの正常系、空送信、サーバー失敗、PDF プレビューの正常系、注文一覧取得失敗の 5 件がすべて通過した
- `node scripts/run-e2e-coverage.mjs` 実行後、E2E coverage の集計で `new` と `pdf-preview` が 100% になった
- `aws sts get-caller-identity` はこの環境では `Unable to locate credentials` だったため、AWS 実地確認は認証済み端末または AWS コンソールで行う前提にする
- 2026-09-02 に Step Functions の失敗実行を実機で確認し、`oms-dev-order-processing-workflow-failed-alarm` の `ALARM` 遷移まで確認した
- 2026-09-02 に SQS の壊れたメッセージを DLQ へ送って復旧し、`oms-dev-order-processing-dlq-alarm` と `oms-dev-order-queue-consumer-error-alarm` が `OK` に戻ることを確認した
