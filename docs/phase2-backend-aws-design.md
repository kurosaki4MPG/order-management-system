# Phase 2 詳細設計書

## 1. 目的

注文管理システムの AWS サーバーレスバックエンドを定義する。
このPhaseでは、注文APIの責務、Lambdaの入出力、DynamoDBの永続化、API Gateway との接続を確定する。

対象STEP:
- STEP16 AWS開発環境準備
- STEP17 Lambda基礎
- STEP18 注文登録API
- STEP19 注文取得API
- STEP20 注文更新・削除API
- STEP21 API Gateway連携
- STEP22 DynamoDB導入
- STEP23 バックエンド設計整理
- STEP24 Next.jsとAWS APIの接続

---

## 2. 全体アーキテクチャ

```text
Next.js UI
  -> API client
  -> API Gateway または Next.js Route Handler
  -> Lambda handler
  -> Service
  -> Repository
  -> DynamoDB
```

### 2.1 基本方針

- HTTP と業務ロジックを分離する
- Service は業務ルールに集中する
- Repository は永続化に集中する
- API 層は入力検証とHTTP応答に集中する

---

## 3. API設計

### 3.1 エンドポイント

| Method | Path | 用途 |
| --- | --- | --- |
| GET | `/orders` | 注文一覧 |
| GET | `/orders/{id}` | 注文詳細 |
| GET | `/orders/{id}/status` | ステータス取得 |
| POST | `/orders` | 注文登録 |
| PATCH | `/orders/{id}` | 注文更新 |
| PATCH | `/orders/{id}/status` | ステータス更新 |
| DELETE | `/orders/{id}` | 注文削除 |

### 3.2 レスポンス契約

- 成功時は JSON で返す
- エラー時は `{ error, issues }` にそろえる
- `issues` は入力検証時のみ返す

### 3.3 HTTPステータス

- `200`: 成功
- `201`: 登録成功
- `400`: 入力不備
- `404`: 対象なし
- `500`: 想定外エラー

---

## 4. ドメインモデル

### 4.1 Order

主な属性:
- `orderId`
- `customerName`
- `customerEmail`
- `shippingAddress`
- `paymentMethod`
- `items`
- `totalAmount`
- `status`
- `createdAt`
- `updatedAt`

### 4.2 OrderItem

- `name`
- `quantity`
- `unitPrice`

### 4.3 ルール

- 注文ID はサーバー生成
- 合計金額はサーバー再計算
- ステータスはサーバー側で遷移制御

---

## 5. Service 設計

### 5.1 責務

- 注文登録
- 注文更新
- 注文削除
- ステータス更新
- 合計金額計算
- 出力データの整形

### 5.2 非責務

- HTTP ステータス決定
- JSON 文字列化
- 永続化の具体実装

---

## 6. Repository 設計

### 6.1 インターフェース

Repository は次の操作を提供する。

- `listOrders`
- `getOrder`
- `saveOrder`
- `updateOrder`
- `deleteOrder`
- `updateOrderStatus`

### 6.2 実装

- 初期は in-memory 実装
- Phase 2 後半で DynamoDB 実装へ差し替える

### 6.3 将来の差し替え方針

- API 層や Service 層は Repository の具象実装に依存しない
- 永続化差し替えは Repository 内に閉じ込める

---

## 7. Lambda 設計

### 7.1 入力

- API Gateway proxy event
- Next.js Route Handler の内部呼び出し

### 7.2 出力

- `{ statusCode, headers, body }`

### 7.3 責務

- イベントから path / method を取り出す
- Service を呼ぶ
- HTTP レスポンスに変換する

---

## 8. DynamoDB 設計

### 8.1 テーブル

- テーブル名: `oms-<stage>-orders`
- Partition Key: `orderId`
- Billing Mode: `PAY_PER_REQUEST`

### 8.2 設計方針

- まずは単一テーブルではなく、注文テーブル単体で始める
- 将来のアクセスパターン増加に応じて GSI を追加する
- 監査やイベント履歴は別テーブルに分離してもよい

---

## 9. バリデーション設計

- 入力は Zod で検証する
- 住所、メール、数量、単価は型だけでなく値域も見る
- `items` は最低1件を必須とする
- 無効データは Service に渡さない

---

## 10. API Gateway 設計

### 10.1 役割

- HTTP 入口
- CORS 応答
- パスごとの Lambda 接続

### 10.2 方式

- HTTP API を採用する
- Lambda proxy integration を採用する
- payload format は Lambda 実装に合わせる

---

## 11. フロントエンド接続

### 11.1 切替

- `NEXT_PUBLIC_API_BASE_URL` がある場合は AWS API を呼ぶ
- 未設定時は Next.js Route Handler を呼ぶ

### 11.2 設計意図

- 開発環境での切り替えを単純にする
- 画面側のコードを環境依存させない

---

## 12. エラー設計

- 入力エラーは 400
- 未存在は 404
- システム障害は 500
- 画面側は HTTP ステータスを優先して判定する

---

## 13. Phase 2 の完了条件

- Lambda 単体で注文APIが動く
- DynamoDB へ保存できる
- API Gateway 経由で呼び出せる
- Next.js から AWS API へ切り替えられる

