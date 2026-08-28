# STEP33 通知処理

この手順書は、STEP32 で作成した EventBridge の注文イベントを受け取り、通知処理へつなぐための実施手順である。

このプロジェクトでは、EventBridge の注文イベントを受けた Lambda が SNS へ通知を送る構成を採用する。

## 目的

- EventBridge の注文イベントを購読する
- 通知処理用の Lambda を作成する
- 通知先を SNS email で用意する
- 冪等性の考え方を確認する
- 後続の SQS / DLQ / Step Functions に進める土台を作る

## 前提

- STEP32 が完了している
- `oms-dev-order-events` または `oms-prod-order-events` の EventBridge bus が存在する
- 注文登録時に `OrderCreated` が送信される
- AWS CLI の `oms-dev` または `oms-prod` プロファイルが使える

## このSTEPで扱う範囲

このSTEPでは次のイベントを通知対象にする。

- `OrderCreated`
- `OrderUpdated`
- `OrderDeleted`
- `OrderStatusChanged`

## 1. 通知方式を決める

この手順書では次の構成を推奨する。

```text
EventBridge rule
  -> Notification Lambda
  -> SNS topic
  -> email subscription
```

理由:

- SNS email は確認しやすい
- Lambda で通知内容を整形できる
- 将来チャット通知や別チャネルに差し替えやすい

## 2. まず SNS topic を用意する

通知先を作る。

推奨名:

- `oms-dev-order-notifications`
- `oms-prod-order-notifications`

作成後、受講者自身のメールアドレスを購読登録する。

### AWS CLI の確認例

```bash
aws sns list-topics \
  --region ap-northeast-1 \
  --profile oms-dev
```

### 手動確認

- topic が存在する
- email subscription が `PendingConfirmation` から `Confirmed` になっている

## 3. Notification Lambda を作る

`src/lambda/order-notification-handler.ts` を新規作成する。

役割:

- EventBridge からイベントを受け取る
- `source`、`detail-type`、`detail` を読み取る
- 通知メッセージを組み立てる
- SNS topic に publish する

### 例として持たせる情報

- `eventId`
- `orderId`
- `detail-type`
- `status`
- `customerName`
- `totalAmount`
- `occurredAt` 相当の時刻

### 通知Lambdaの考え方

- 画面表示の責務は持たない
- 業務イベントの通知だけを行う
- 同じイベントが複数回来ても壊れないようにする

## 4. 通知Lambda の IAM 権限を付ける

通知 Lambda には次の権限が必要である。

- `AWSLambdaBasicExecutionRole`
- `sns:Publish` 対象 topic への許可

確認ポイント:

- CloudWatch Logs に出力できる
- SNS に publish できる

## 5. EventBridge rule を作る

`infra/lib/order-api-stack.js` に通知用 rule を追加する。

推奨ルール名:

- `OrderCreatedNotificationRule`
- `OrderUpdatedNotificationRule`
- `OrderDeletedNotificationRule`
- `OrderStatusChangedNotificationRule`

### ルールの条件

Event bus:

- `oms-${stage}-order-events`

イベント条件:

- `source = oms.orders`
- `detail-type = OrderCreated`

### ターゲット

- 通知 Lambda

## 6. Lambda から SNS へ通知する

通知 Lambda の中で SNS にメッセージを送る。

メッセージには次を含める。

- イベント種別
- 注文ID
- 顧客名
- ステータス
- 合計金額
- イベントID

### 通知文の例

```text
注文が登録されました
注文ID: ORD-DEV-001
顧客名: テスト顧客
合計金額: 6000円
ステータス: pending
イベントID: evt-123456
```

## 7. 冪等性を考える

このSTEPでは、完全な重複排除を無理に作り込まない。

ただし、設計としては次を決める。

- `eventId` を冪等性キー候補にする
- 同じ `eventId` を再通知しない方針を採る
- 本格的な重複排除は後続の SQS / DLQ / 監査ストアで補強する

## 8. デプロイ後の確認

以下を順に確認する。

### 8.1 EventBridge rule

```bash
aws events list-rules \
  --event-bus-name oms-dev-order-events \
  --region ap-northeast-1 \
  --profile oms-dev
```

### 8.2 Lambda の存在確認

```bash
aws lambda get-function \
  --function-name oms-dev-order-notification \
  --region ap-northeast-1 \
  --profile oms-dev
```

### 8.3 SNS subscription の確認

```bash
aws sns list-subscriptions-by-topic \
  --topic-arn <topic-arn> \
  --region ap-northeast-1 \
  --profile oms-dev
```

### 8.4 注文登録で発火確認

注文を1件登録する。

確認ポイント:

- 注文登録が成功する
- Notification Lambda が起動する
- SNS email が届く
- CloudWatch Logs に通知内容が出る

## 9. よくある失敗

### メールが届かない

確認すること:

- email subscription が `Confirmed` か
- topic に publish されているか
- Lambda の `sns:Publish` 権限があるか

### EventBridge rule が動かない

確認すること:

- bus 名が正しいか
- `source` と `detail-type` の条件が一致しているか
- Lambda のターゲット設定が正しいか

### 同じイベントが複数回通知される

確認すること:

- EventBridge は少なくとも1回配送を前提にする
- `eventId` を使った重複排除をどこで行うか決める
- 完全な排他制御は後続の設計で扱う

## 10. 完了条件

次を満たせば STEP33 は完了である。

- EventBridge の注文イベントを受ける Notification Lambda がある
- SNS topic に通知を送れる
- 注文登録後に通知が届く
- `eventId` を冪等性の判断材料として扱う方針が決まっている

## 11. 次のSTEP

STEP33 が完了したら、STEP34 で SQS を導入する。
