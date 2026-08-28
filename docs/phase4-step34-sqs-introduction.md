# STEP34 SQS導入

この手順書は、STEP33 までで発行された注文イベントの後続処理を SQS で受けるための実施手順である。

このSTEPでは、EventBridge から SQS へイベントを流し、SQS を購読する Lambda がメッセージを処理できることを確認する。
DLQ はまだ作らない。失敗メッセージの逃がし先は STEP35 で扱う。

## 目的

- SQS を注文イベントの受け皿として用意する
- EventBridge から SQS にメッセージを流す
- SQS をトリガーにした Lambda を作る
- ポーリング処理の流れを確認する
- 正常系のメッセージを SQS と Lambda で受け取れることを確認する
- 後続の DLQ / Step Functions に進める土台を作る

## 前提

- STEP32 の EventBridge 導入が完了している
- STEP33 の通知 Lambda が動作している
- `OrderCreated` などの注文イベントが EventBridge に送られている
- AWS CLI の `oms-dev` または `oms-prod` プロファイルが使える

## このSTEPで扱う範囲

このSTEPでは、まず SQS の標準キューを 1 つ作る。

推奨名:

- `oms-dev-order-processing-queue`
- `oms-prod-order-processing-queue`

このキューは、注文イベントの後続処理を一時的に受けるためのものとする。

## 1. SQS の役割を決める

受講者は、SQS を何のために使うかを決める。

ここでは次の役割に限定する。

- EventBridge から来た注文イベントを一旦溜める
- 後続の処理 Lambda に順次渡す
- 一時的な負荷を吸収する

このSTEPでは、SQS を注文通知の代替にしない。
通知は STEP33 の SNS 経路で行い、SQS は別の非同期処理経路として扱う。

## 2. SQS キューを作る

AWS コンソール、または AWS CLI で標準キューを作成する。

### 作成時の主な設定

- キュー種別: Standard
- 可視性タイムアウト: 30秒前後
- メッセージ保持期間: 4日間前後
- ロングポーリング: 20秒
- 暗号化: 標準設定で可

### CLI の例

```bash
aws sqs create-queue \
  --queue-name oms-dev-order-processing-queue \
  --attributes VisibilityTimeout=30,MessageRetentionPeriod=345600,ReceiveMessageWaitTimeSeconds=20 \
  --region ap-northeast-1 \
  --profile oms-dev
```

### 確認

```bash
aws sqs get-queue-url \
  --queue-name oms-dev-order-processing-queue \
  --region ap-northeast-1 \
  --profile oms-dev
```

## 3. SQS を受ける Lambda を作る

`src/lambda/order-queue-consumer.ts` を新規作成する。

役割:

- SQS メッセージを受け取る
- 受信した EventBridge イベントをログに残す
- 必要な場合に後続処理へつなぐ

### 実装方針

- まずは受信内容をそのまま CloudWatch Logs に出す
- 業務処理はまだ入れない
- メッセージの `detail-type` と `detail.orderId` を確認しやすくする

### 確認ポイント

- Lambda が SQS メッセージを受け取れる
- 受信ログにイベント種別が出る

### 正常系メッセージの確認

`STEP34` では、まず正常系の EventBridge 形式メッセージを送って、Consumer Lambda が受信内容をログに残せることを確認する。

```json
{
  "detail-type": "OrderCreated",
  "detail": {
    "orderId": "ORD-TEST-001",
    "eventId": "evt-test-001"
  },
  "source": "oms.orders",
  "time": "2026-08-26T12:00:00Z"
}
```

このメッセージは Consumer Lambda の最低条件を満たすため、`STEP34` では受信ログ確認用に使う。

## 4. EventBridge から SQS に流す

`infra/lib/order-api-stack.js` に EventBridge rule を追加し、SQS キューをターゲットにする。

### 推奨ルール

- `OrderProcessingQueueRule`

### 推奨条件

まずは `OrderCreated` を対象にする。

必要なら、後から次も追加できる。

- `OrderUpdated`
- `OrderDeleted`
- `OrderStatusChanged`

### 注意

- EventBridge から SQS に直接送る場合は、キューに対して送信許可が必要になる
- このSTEPでは DLQ は付けない
- 失敗時の逃がし先は STEP35 で追加する

## 5. SQS から Lambda を呼ぶ

SQS キューにイベントが入ったら、Lambda が自動でポーリングして処理するようにする。

### 確認すること

- EventBridge から SQS にメッセージが届く
- SQS のトリガーで Lambda が起動する
- Lambda の CloudWatch Logs に受信内容が残る

## 6. 動作確認

### 6.1 キュー作成確認

```bash
aws sqs get-queue-url \
  --queue-name oms-dev-order-processing-queue \
  --region ap-northeast-1 \
  --profile oms-dev
```

### 6.2 Lambda 確認

```bash
aws lambda get-function \
  --function-name oms-dev-order-queue-consumer \
  --region ap-northeast-1 \
  --profile oms-dev
```

### 6.3 EventBridge rule 確認

```bash
aws events list-rules \
  --event-bus-name oms-dev-order-events \
  --region ap-northeast-1 \
  --profile oms-dev
```

### 6.4 注文登録で確認

注文を 1 件登録する。

確認ポイント:

- EventBridge に `OrderCreated` が送られる
- SQS にメッセージが入る
- Consumer Lambda が起動する
- CloudWatch Logs に受信内容が残る

### 6.5 SQS コンソールでの手動確認

手動で SQS の受信だけを確認したい場合は、`oms-dev-order-processing-queue` の `送受信メッセージ` を使う。

1. `送受信メッセージ` を開く
2. 上の正常系 JSON を送る
3. `Poll for messages` でメッセージが受信できることを確認する
4. Consumer Lambda の CloudWatch Logs に受信ログが残ることを確認する

DLQ への移送確認は `STEP35` で行う。

## 7. よくある失敗

### キューにメッセージが入らない

確認すること:

- EventBridge rule の対象イベントが正しいか
- `source` / `detail-type` が一致しているか
- キューへの送信許可があるか

### Lambda が起動しない

確認すること:

- SQS の event source mapping が作成されているか
- Lambda の実行ロールに SQS 読み取り権限があるか
- 可視性タイムアウトが短すぎないか

### メッセージが繰り返し処理される

確認すること:

- Lambda が失敗していないか
- メッセージ削除が成功しているか
- 重複排除はまだ本格実装していない前提であること

## 8. 完了条件

次を満たせば STEP34 は完了である。

- SQS 標準キューが作成されている
- EventBridge から SQS にメッセージを流せる
- SQS をトリガーにした Lambda が動く
- 注文登録後にキューと Lambda の両方を確認できる
- 正常系のメッセージを手動送信して受信ログを確認できる

## 9. 次のSTEP

STEP34 が完了したら、STEP35 で DLQ を導入し、失敗メッセージの退避先を作る。
