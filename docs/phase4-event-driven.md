# Phase 4 イベント駆動・非同期処理

対象STEP:
- STEP31 イベント駆動設計
- STEP32 EventBridge導入
- STEP33 通知処理
- STEP34 SQS導入
- STEP35 DLQ設計
- STEP36 Step Functions導入
- STEP37 注文処理ワークフロー
- STEP38 非同期処理の監視

## STEP31 イベント駆動設計

このSTEPでは、まだAWSリソースは作らない。
まず「何をイベント化するか」を、ユーザー自身の手で設計してもらう。
ここで確定した内容は `docs/phase4-event-driven-design.md` に詳細設計としてまとめる。

## 目的

- 同期処理と非同期処理の境界を決める
- 注文システムでイベント化する業務イベントを整理する
- EventBridge 導入前に、イベント名・発火点・購読先の方針を決める

## 事前に読むもの

- `docs/backend-design.md`
- `docs/api-gateway-integration.md`
- これまでの注文API実装

## 作業手順

### 1. 業務イベントの候補を書き出す

ユーザーは、注文管理で発生しうるイベント候補をメモに書き出す。

候補例:
- 注文作成
- 注文更新
- 注文削除
- 注文ステータス変更
- 注文処理開始
- 注文処理完了
- 注文処理失敗
- 通知送信
- 帳票生成

### 2. 同期で返すものと非同期に逃がすものを分ける

ユーザーは、次の基準で仕分ける。

- 画面の即時応答に必要なものは同期処理
- 外部通知、監査ログ、分析、後続ワークフローは非同期処理
- 注文登録そのものは同期で完了させる
- 登録後の通知や後続処理はイベント化する

### 3. 今回のPhase 4で扱うイベントを決める

この時点では、すべてをイベント化しない。
まずは次のどれを対象にするか決める。

推奨:
- `OrderCreated`
- `OrderUpdated`
- `OrderDeleted`
- `OrderStatusChanged`

必要なら次のイベントも候補に入れる。

- `OrderProcessingRequested`
- `OrderProcessingCompleted`
- `OrderProcessingFailed`

### 4. イベントの送信元を決める

ユーザーは、どの処理の完了時にイベントを発行するかを決める。

例:
- 注文登録APIの成功後に `OrderCreated`
- 注文更新APIの成功後に `OrderUpdated`
- 注文削除APIの成功後に `OrderDeleted`
- ステータス変更APIの成功後に `OrderStatusChanged`

### 5. イベントの購読先を決める

各イベントを誰が受け取るかを決める。

例:
- 通知処理
- 監査用ログ
- 将来の Step Functions ワークフロー
- 分析用の集計処理

### 6. イベントの形を決める

最低限、次を含める。

- `source`
- `detail-type`
- `detail`
- `orderId`
- `eventId`
- `occurredAt`
- `version`

`OrderUpdated` は更新後スナップショット型にする。
フロント側でそのまま表示用データとして扱い、余計なAPI再取得を減らすためである。

### 7. 設計メモを残す

ユーザーは、以下を短く文章化する。

- どの操作でイベントを発行するか
- どのイベントを誰が受け取るか
- 同期と非同期の境界
- 冪等性をどう考えるか

## 記載例

```text
OrderCreated
  source: oms.orders
  detail-type: OrderCreated
  発火点: 注文登録成功後
  購読先: 通知処理、監査ログ、将来の処理基盤

OrderUpdated
  source: oms.orders
  detail-type: OrderUpdated
  detail: 更新後の注文スナップショット
  発火点: 注文更新成功後
  購読先: 通知処理、監査ログ、フロント表示更新
```

## 確認観点

- 同期で終える処理と非同期に逃がす処理を分けられているか
- イベント名が業務イベントとして自然か
- 発火点がAPIの成功タイミングと一致しているか
- 購読先が後から増やしやすいか
- 1つのイベントに責務を詰め込みすぎていないか

## 完了条件

- Phase 4 で扱うイベント候補が決まっている
- 各イベントの発火点と購読先が言語化されている
- EventBridge 導入前の設計メモが残っている

## STEP32 EventBridge導入

このSTEPでは、EventBridge の「受け皿」を作り、注文登録完了時に最初のイベントを送れる状態にする。
まだ通知処理やSQS連携は作らない。まずはイベントバスへ1件送れることを確認する。

## 目的

- 注文イベントを受ける EventBridge バスを作る
- Lambda から `PutEvents` できるようにする
- `OrderCreated` を最初の送信対象にする
- 後続の通知処理やワークフロー接続の土台を作る

## 事前に読むもの

- `docs/phase4-event-driven-design.md`
- `infra/lib/order-api-stack.js`
- `src/lambda/order-api-gateway-handler.ts`

## 実施手順

### 1. EventBridge バスを CDK に追加する

`infra/lib/order-api-stack.js` を編集し、次の内容を追加する。

- `aws-cdk-lib/aws-events` を import する
- スタック内に custom event bus を作る
- バス名は `oms-${stage}-order-events` とする

確認ポイント:
- `dev` では `oms-dev-order-events`
- `prod` では `oms-prod-order-events`

### 2. Lambda にイベント送信権限を付与する

同じく `infra/lib/order-api-stack.js` で、注文API Lambda に EventBridge 送信権限を付ける。

必要な権限:
- `events:PutEvents`

対象:
- 追加した custom event bus

### 3. Lambda の環境変数を追加する

`orderApiFunction` に次の環境変数を追加する。

- `ORDER_EVENTS_BUS_NAME`
- 必要なら `ORDER_EVENTS_BUS_ARN`

この値は、Lambda 側のイベント発行処理で使う。

### 4. イベント発行ヘルパーを作る

`src/features/orders/` 配下にイベント発行用の処理を追加する。

推奨ファイル例:
- `src/features/orders/events/order-event-publisher.ts`
- `src/features/orders/events/order-event-types.ts`

役割:
- `source`
- `detail-type`
- `detail`
- `eventId`
- `version`

を整形して EventBridge に渡す。

### 5. `OrderCreated` を送る

`src/lambda/order-api-gateway-handler.ts` の注文登録成功後に `OrderCreated` を送る。

処理の順序:
1. 注文を作成する
2. 作成結果を受け取る
3. EventBridge に `OrderCreated` を送る
4. API レスポンスを返す

注意:
- イベント送信に失敗した場合はログを残し、注文登録自体は成功として返す
- このSTEPでは「API成功後にイベントを送れる」ことを確認する
- 将来的に outbox へ置き換える前提で、まずはベストエフォート送信にする

### 6. 詳細設計どおりの payload にする

`OrderCreated` は以下の形にそろえる。

- `source: oms.orders`
- `detail-type: OrderCreated`
- `detail.orderId`
- `detail.customerName`
- `detail.customerEmail`
- `detail.eventId`
- `detail.createdAt`
- `detail.updatedAt`
- `detail.paymentMethod`
- `detail.shippingAddress`
- `detail.totalAmount`
- `detail.status`
- `detail.version`

### 7. 動作確認用の出力を追加する

CDK の `CfnOutput` に次を追加する。

- EventBridge バス名
- EventBridge バスARN

これでデプロイ後に確認しやすくする。

### 8. 依存関係を追加する

必要なら `@aws-sdk/client-eventbridge` を追加する。

確認ポイント:
- Lambda から EventBridge SDK を呼べること
- local 開発時は bus が未設定ならイベント送信をスキップできること

## ユーザーが確認すること

- `cdk synth` が通る
- `OrderCreated` を送るコードが入っている
- `dev` の bus 名が `oms-dev-order-events` になっている
- `prod` の bus 名が `oms-prod-order-events` になっている
- イベント送信権限が Lambda に付与されている

## 完了条件

- EventBridge の custom bus が CDK で作成される
- Lambda から `OrderCreated` を送れる
- デプロイ後に bus 名とARNを確認できる

## STEP33 通知処理

STEP33 の詳細実施手順は [phase4-step33-notification-processing.md](./phase4-step33-notification-processing.md) を参照する。

実施内容:
- イベントを受けて通知する Lambda を作る
- 通知先を決める
- `OrderCreated` / `OrderUpdated` / `OrderDeleted` / `OrderStatusChanged` を通知対象にする
- 冪等性の考え方を確認する

確認観点:
- 同じイベントで通知が重複しない

完了条件:
- 通知の非同期処理ができる

## STEP34 SQS導入

STEP34 の詳細実施手順は [phase4-step34-sqs-introduction.md](./phase4-step34-sqs-introduction.md) を参照する。

実施内容:
- キューを作る
- Producer と Consumer を分ける
- ポーリング処理を確認する

確認観点:
- 処理をキューに逃がせる

完了条件:
- 疎結合な待ち行列ができる

## STEP35 DLQ設計

STEP35 の詳細実施手順は [phase4-step35-dlq-design.md](./phase4-step35-dlq-design.md) を参照する。

実施内容:
- 失敗メッセージの逃がし先を作る
- リトライ回数を決める
- 障害時の確認手順を決める

確認観点:
- 失敗を取りこぼさない

完了条件:
- 障害メッセージを追える

## STEP36 Step Functions導入

STEP36 の詳細実施手順は [phase4-step36-step-functions-introduction.md](./phase4-step36-step-functions-introduction.md) を参照する。

実施内容:
- 状態遷移を設計する
- 失敗分岐を作る
- タスクのつなぎ方を確認する

確認観点:
- ワークフローとして見える

完了条件:
- 複数処理を順序立てて扱える

## STEP37 注文処理ワークフロー

STEP37 の詳細実施手順は [phase4-step37-order-processing-workflow.md](./phase4-step37-order-processing-workflow.md) を参照する。

実施内容:
- 注文受付から処理完了までの流れを作る
- 各ステップに責務を割り当てる
- 再実行の考え方を整理する

確認観点:
- 業務フローとして説明できる

完了条件:
- 注文処理の一連の流れが完成する

## STEP38 非同期処理の監視

STEP38 の詳細実施手順は [phase4-step38-async-monitoring.md](./phase4-step38-async-monitoring.md) を参照する。

実施内容:
- ログを確認する
- DLQ を監視する
- 失敗時の切り分けを定める

確認観点:
- 問題発生時に追跡できる

完了条件:
- 非同期処理を運用できる
