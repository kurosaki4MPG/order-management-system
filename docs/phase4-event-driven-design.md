# Phase 4 詳細設計書

## 1. 目的

この設計書は、注文管理システムにおけるイベント駆動・非同期処理の実装方針を固定するための詳細設計である。

対象は以下の STEP である。

- STEP31 イベント駆動設計
- STEP32 EventBridge導入
- STEP33 通知処理
- STEP34 SQS導入
- STEP35 DLQ設計
- STEP36 Step Functions導入
- STEP37 注文処理ワークフロー
- STEP38 非同期処理の監視

このフェーズでは、まず注文の同期APIで業務の正当性を確保し、その結果をイベントとして外部へ配信する。
イベントの受信側は、通知、監査、将来のワークフロー連携を担当する。

---

## 2. 設計の前提

### 2.1 既存のバックエンド前提

既存の注文APIは、次の責務分離を前提としている。

```text
Next.js UI
  -> API client
  -> Next.js Route Handler または API Gateway
  -> Lambda handler
  -> Order service
  -> Order repository
  -> DynamoDB
```

### 2.2 このフェーズでの基本方針

- 注文登録・更新・削除は同期APIで完了させる
- API 成功後にイベントを発行する
- イベントは業務の事実を表す
- イベントの購読側は後から増やせる設計にする
- `OrderUpdated` は更新後スナップショット型とする
- フロント側は `OrderUpdated` を再表示用データとしてそのまま扱えるようにする

---

## 3. 全体構成

### 3.1 処理の流れ

```text
Next.js UI
  -> API client
  -> API Gateway
  -> Lambda handler
  -> Order service
  -> Order repository
  -> DynamoDB
  -> EventBridge
  -> 非同期購読先
```

### 3.2 非同期購読先

初期段階で想定する購読先は次の通り。

- 通知処理
- 監査ログ
- 将来の Step Functions ワークフロー
- 将来の集計処理

---

## 4. イベント設計

### 4.1 イベント共通方針

すべての注文イベントは、次の共通ルールで扱う。

- `source` は `oms.orders` とする
- `detail-type` は業務イベント名とする
- `detail` に業務データを入れる
- `eventId` は `randomUUID()` などでイベントごとに一意とする
- `occurredAt` もしくは `createdAt` / `updatedAt` を含める
- `version` を持たせ、将来の形式変更に備える

### 4.2 イベント一覧

| イベント | 発火点 | 主な用途 |
| --- | --- | --- |
| `OrderCreated` | 注文登録成功後 | 通知、監査、将来の処理基盤 |
| `OrderUpdated` | 注文更新成功後 | 通知、監査、フロント表示更新 |
| `OrderDeleted` | 注文削除成功後 | 通知、監査 |
| `OrderStatusChanged` | 注文ステータス変更成功後 | 通知、監査 |

---

## 5. イベント詳細仕様

### 5.1 OrderCreated

注文登録が成功した時点で発行する。

#### payload

```json
{
  "source": "oms.orders",
  "detail-type": "OrderCreated",
  "detail": {
    "orderId": "ORD-DEV-001",
    "customerName": "テスト顧客",
    "customerEmail": "hoge@hoge.com",
    "eventId": "evt-123456",
    "createdAt": "2026-08-25T10:00:00.000Z",
    "updatedAt": "2026-08-25T10:00:00.000Z",
    "paymentMethod": "credit-card",
    "shippingAddress": "神奈川県横浜市西区みなとみらい2-2-1",
    "totalAmount": 500,
    "status": "pending",
    "version": 1
  }
}
```

#### 設計意図

- 登録直後の状態をそのまま表現する
- 通知や監査で必要な値を1件で参照できる
- 画面側が再取得しなくても表示を更新しやすい

### 5.2 OrderUpdated

注文更新が成功した時点で発行する。

このイベントは、更新後スナップショット型とする。
フロント側でそのまま表示用データとして扱い、不要な API 再取得を減らす。

#### payload

```json
{
  "source": "oms.orders",
  "detail-type": "OrderUpdated",
  "detail": {
    "orderId": "ORD-DEV-001",
    "eventId": "evt-123457",
    "updatedAt": "2026-08-25T10:00:00.000Z",
    "customerName": "テスト顧客",
    "customerEmail": "hoge@hoge.com",
    "paymentMethod": "credit-card",
    "shippingAddress": "神奈川県横浜市西区みなとみらい2-2-1",
    "totalAmount": 100,
    "status": "pending",
    "version": 1
  }
}
```

#### 設計意図

- 更新後の注文状態を1件のデータとして扱える
- 監査ログと画面更新の両方に使える
- 差分通知ではなくスナップショットとして扱うため、受信側が単純になる

### 5.3 OrderDeleted

注文削除が成功した時点で発行する。

#### payload

```json
{
  "source": "oms.orders",
  "detail-type": "OrderDeleted",
  "detail": {
    "orderId": "ORD-DEV-001",
    "eventId": "evt-123458",
    "deletedAt": "2026-08-25T10:00:00.000Z",
    "version": 1
  }
}
```

#### 設計意図

- 削除対象が特定できることを優先する
- 監査用途で削除時刻を残す
- 最小限の情報でイベントを軽く保つ

### 5.4 OrderStatusChanged

注文ステータス変更が成功した時点で発行する。

#### payload

```json
{
  "source": "oms.orders",
  "detail-type": "OrderStatusChanged",
  "detail": {
    "orderId": "ORD-DEV-001",
    "eventId": "evt-123459",
    "updatedAt": "2026-08-25T10:00:00.000Z",
    "status": "processing",
    "version": 1
  }
}
```

#### 設計意図

- 状態変化の事実を表す
- 通知や監査にそのまま利用しやすい
- 必要であれば将来 `previousStatus` を追加できる

---

## 6. 業務イベントと発火点

### 6.1 注文登録

1. フロントエンドが注文登録APIを呼ぶ
2. API 層で入力検証を行う
3. Service が注文ID、日時、合計金額を決める
4. Repository が DynamoDB に保存する
5. 保存成功後に `OrderCreated` を発行する
6. 発行失敗はログに残し、注文登録自体は成功として返す
7. API は `201` を返す

### 6.2 注文更新

1. フロントエンドが注文更新APIを呼ぶ
2. API 層で入力検証を行う
3. Service が更新後の注文を組み立てる
4. Repository が DynamoDB を更新する
5. 更新成功後に `OrderUpdated` を発行する
6. API は更新後スナップショットを返す

### 6.3 注文削除

1. フロントエンドが注文削除APIを呼ぶ
2. API 層で対象注文を確認する
3. Repository が DynamoDB から削除する
4. 削除成功後に `OrderDeleted` を発行する
5. API は `deleted` と `orderId` を返す

### 6.4 注文ステータス変更

1. フロントエンドまたは将来の処理基盤がステータス変更APIを呼ぶ
2. Service が変更後の状態を決める
3. Repository が DynamoDB を更新する
4. 更新成功後に `OrderStatusChanged` を発行する
5. API は更新後の注文状態を返す

---

## 7. EventBridge 設計

### 7.1 役割

EventBridge は、注文APIから非同期処理へイベントを配信するための中継基盤とする。

### 7.2 バス設計

初期は default bus でもよいが、将来の分離を見据えて専用 bus を使うことを推奨する。

推奨命名例:
- `oms-dev-order-events`
- `oms-prod-order-events`

### 7.3 ルール設計

イベント種別ごとにルールを分ける。

例:
- `OrderCreatedRule`
- `OrderUpdatedRule`
- `OrderDeletedRule`
- `OrderStatusChangedRule`

### 7.4 ターゲット設計

初期ターゲット候補:

- 通知 Lambda
- 監査ログ Lambda
- SQS キュー
- Step Functions ステートマシン

---

## 8. 非同期処理の責務

### 8.1 通知処理

役割:
- 注文イベントを受け取り、メール送信やチャット通知の起点にする

要件:
- 同じイベントで二重送信しない
- eventId をキーに冪等性を確保する

### 8.2 監査ログ

役割:
- 注文の操作履歴を保存する

要件:
- イベントの事実をそのまま記録する
- 監査目的なので最低限 `eventId`、`orderId`、`detail-type`、`occurredAt` を持つ

### 8.3 将来のワークフロー

役割:
- 注文処理の後続タスクを順番に実行する

要件:
- 注文登録APIの応答を遅くしない
- 障害時に再実行できる

---

## 9. SQS と DLQ の設計方針

### 9.1 SQS を使う理由

- EventBridge からの受け口を一段挟み、処理の疎結合性を高める
- 一時的な負荷変動を吸収する
- 後続処理を非同期に分離する

### 9.2 DLQ を使う理由

- 失敗したメッセージを取りこぼさない
- リトライ限界到達後の調査対象を残す
- 障害対応時に対象イベントを再処理しやすくする

### 9.3 運用観点

- リトライ回数は多すぎないようにする
- DLQ を定期監視する
- 失敗理由はログに残す

---

## 10. Step Functions の設計方針

### 10.1 役割

Step Functions は、複数タスクを順序立てて実行するワークフローの定義に使う。

### 10.2 使いどころ

- 注文受付後の承認フロー
- 帳票生成
- 通知
- 外部連携

### 10.3 設計原則

- 1ステートに責務を詰め込みすぎない
- 失敗分岐を必ず定義する
- 再実行しやすい単位で分割する

---

## 11. 冪等性設計

### 11.1 必須方針

イベント処理は重複実行を前提に設計する。

### 11.2 冪等性のキー

推奨キー:
- `eventId`
- 必要に応じて `orderId` と `detail-type` の組み合わせ

### 11.3 判定場所

- Lambda 内で既処理判定する
- DynamoDB で処理済みイベントを記録する
- 将来は監査用テーブルにまとめてもよい

---

## 12. エラー設計

### 12.1 同期APIのエラー

同期APIは以下を返す。

- `400`: 入力不備
- `404`: 対象なし
- `500`: 想定外エラー

### 12.2 非同期処理のエラー

非同期側は以下の方針で扱う。

- 一時障害はリトライ
- 恒久障害は DLQ へ送る
- 監視で気づけるようにログを出す

---

## 13. ログ・監視設計

### 13.1 ログ出力方針

すべての非同期処理では、最低限次をログに残す。

- `eventId`
- `orderId`
- `detail-type`
- 処理結果
- エラー時の理由

### 13.2 監視対象

- Lambda エラー数
- EventBridge 失敗数
- SQS の滞留数
- DLQ メッセージ数

---

## 14. 実装責務の分離

### 14.1 API 層

責務:
- リクエストを受ける
- バリデーションする
- Service を呼ぶ
- イベント発行を委譲する

### 14.2 Service 層

責務:
- 注文の業務ルールを適用する
- 保存後のイベント発行内容を作る

### 14.3 Repository 層

責務:
- DynamoDB の読み書き

### 14.4 Event Publisher

責務:
- EventBridge へイベントを送る
- `source` と `detail-type` の整形を担う

---

## 15. 実装時の判断基準

- 同期処理を長くしない
- イベントは業務の事実を表す
- `OrderUpdated` は画面再表示に使える形にする
- 削除イベントは最小限にする
- 購読先は後から追加できるようにする
- 冪等性は必ず設計に含める
- イベント発行失敗時は現時点ではログ出力を優先し、将来的に outbox を導入する

---

## 16. Phase 4 の完了条件

この詳細設計が満たされていれば、Phase 4 は実装に進める。

- 発行するイベントが決まっている
- 各イベントの payload が決まっている
- どの API がどのイベントを発行するか決まっている
- EventBridge の役割が定義されている
- SQS / DLQ / Step Functions の使い分けが決まっている
- ログと監視の観点が決まっている
