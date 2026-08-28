# STEP36 Step Functions導入

この手順書は、STEP35 で整えた SQS / DLQ の非同期処理に加えて、Step Functions を使ったワークフロー実行基盤を導入するための実施手順である。

このSTEPでは、まだ注文の本処理をすべて Step Functions に載せ替えない。まずは、順序立てたタスク実行と失敗分岐を確認できる最小ワークフローを作る。

## 目的

- Step Functions の実行基盤を用意する
- 状態遷移と失敗分岐を確認する
- タスクを順番に実行する流れを見える化する
- 将来の注文処理ワークフローに進む土台を作る

## 前提

- STEP34 で SQS と Consumer Lambda が作成されている
- STEP35 で DLQ と `redrive policy` が設定されている
- AWS CLI の `oms-dev` または `oms-prod` プロファイルが使える

## このSTEPで扱う範囲

このSTEPでは、次の構成を追加する。

- Step Functions の state machine
- ワークフロー用の Lambda task
- 成功時と失敗時の分岐
- CloudWatch Logs での実行確認

この段階では、まだ EventBridge や SQS に本格接続しない。
まずは手動実行でワークフローの形を確認する。

## 1. ワークフローの役割を決める

Step Functions は、複数の処理を順番に並べて見せるために使う。

このSTEPでは次の役割に限定する。

- タスクを順序立てて実行する
- 失敗したら明示的に止める
- 実行ログを残す

業務ロジックの本体はまだここに持ち込まない。

## 2. ワークフロー用 Lambda を作る

`src/lambda/order-workflow-handler.ts` を新規作成する。

役割:

- Step Functions から渡された入力を検証する
- `prepare` と `finalize` の 2 段階を処理する
- 失敗シミュレーションを受ける
- 実行内容を CloudWatch Logs に残す

### 入力の例

```json
{
  "workflow": "order-processing",
  "detailType": "OrderCreated",
  "orderId": "ORD-TEST-001",
  "eventId": "evt-test-001",
  "customerName": "テスト顧客",
  "customerEmail": "test@example.com",
  "paymentMethod": "credit-card",
  "shippingAddress": "東京都港区1-2-3",
  "status": "pending",
  "totalAmount": 5000,
  "shouldFail": false
}
```

### 失敗確認用の例

```json
{
  "workflow": "order-processing",
  "detailType": "OrderCreated",
  "orderId": "ORD-TEST-001",
  "eventId": "evt-test-001",
  "customerName": "テスト顧客",
  "customerEmail": "test@example.com",
  "paymentMethod": "credit-card",
  "shippingAddress": "東京都港区1-2-3",
  "status": "pending",
  "totalAmount": 5000,
  "shouldFail": true
}
```

この入力では `prepare` ステップで例外を投げ、失敗分岐を確認できる。

## 3. Step Functions state machine を作る

`infra/lib/order-api-stack.js` に state machine を追加する。

推奨名:

- `oms-dev-order-processing-workflow`
- `oms-prod-order-processing-workflow`

### 構成

1. `prepare` タスクを実行する
2. `finalize` タスクを実行する
3. 成功したら `Succeed` に進む
4. 失敗したら `Fail` に進む

### 設計方針

- 1 本のワークフローで「成功」と「失敗」の両方を見せる
- 実行ログを残して追跡しやすくする
- 将来はここに本番の注文処理タスクを差し込めるようにする

## 4. デプロイ後の確認

### 4.1 state machine の確認

```bash
aws stepfunctions list-state-machines \
  --region ap-northeast-1 \
  --profile oms-dev
```

### 4.2 Lambda の確認

```bash
aws lambda get-function \
  --function-name oms-dev-order-workflow-task \
  --region ap-northeast-1 \
  --profile oms-dev
```

### 4.3 手動実行の確認

Step Functions コンソールで `oms-dev-order-processing-workflow` を開き、`実行を開始` から上の入力例を送る。

確認ポイント:

- `prepare` が実行される
- `finalize` が実行される
- 実行が `Succeeded` になる
- CloudWatch Logs にタスクのログが残る

### 4.4 CLI での実行確認

コンソールではなく CLI で確認したい場合は次を使う。

```bash
aws stepfunctions start-execution \
  --state-machine-arn <state-machine-arn> \
  --name oms-dev-order-processing-workflow-success \
  --input '{"workflow":"order-processing","detailType":"OrderCreated","orderId":"ORD-TEST-001","eventId":"evt-test-001","customerName":"テスト顧客","customerEmail":"test@example.com","paymentMethod":"credit-card","shippingAddress":"東京都港区1-2-3","status":"pending","totalAmount":5000,"shouldFail":false,"source":"oms.orders"}' \
  --region ap-northeast-1 \
  --profile oms-dev
```

失敗分岐を確認したい場合は `shouldFail` を `true` にする。

```bash
aws stepfunctions start-execution \
  --state-machine-arn <state-machine-arn> \
  --name oms-dev-order-processing-workflow-failure \
  --input '{"workflow":"order-processing","detailType":"OrderCreated","orderId":"ORD-TEST-001","eventId":"evt-test-001","customerName":"テスト顧客","customerEmail":"test@example.com","paymentMethod":"credit-card","shippingAddress":"東京都港区1-2-3","status":"pending","totalAmount":5000,"shouldFail":true,"source":"oms.orders"}' \
  --region ap-northeast-1 \
  --profile oms-dev
```

### 4.5 失敗分岐の確認

同じ state machine に `shouldFail: true` の入力を送る。

確認ポイント:

- `prepare` で例外が発生する
- 実行が `Failed` になる
- CloudWatch Logs に失敗理由が残る

## 5. よくある失敗

### state machine が見つからない

確認すること:

- CDK デプロイが終わっているか
- stage が `dev` / `prod` のどちらか正しいか
- state machine 名を間違えていないか

### Lambda が起動しない

確認すること:

- state machine の task に Lambda が設定されているか
- 実行ロールに invoke 権限があるか
- Lambda の CloudWatch Logs を見られるか

### 失敗分岐に入らない

確認すること:

- `shouldFail` を `true` にしているか
- `prepare` ステップで例外を投げる実装になっているか
- 失敗時の `Catch` が `Fail` に接続されているか

## 6. 完了条件

次を満たせば STEP36 は完了である。

- Step Functions の state machine が作成されている
- ワークフロー用 Lambda が作成されている
- `prepare` と `finalize` の順序実行が確認できる
- 失敗入力で `Fail` 分岐に入る
- 実行ログを CloudWatch で追える

## 7. 次のSTEP

STEP36 が完了したら、STEP37 で注文処理ワークフローを業務フローに寄せていく。
