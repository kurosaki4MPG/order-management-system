# STEP20 注文更新・削除API

このステップでは、注文の更新と削除を Lambda で表現する。

## 目的

- 注文更新の `PATCH` を作る
- 注文削除の `DELETE` を作る
- 更新時に入力検証を行う
- 削除時の `404` と成功応答を返す

## 実装ファイル

- `src/lambda/order-update-delete-handler.ts`

## 更新

### ステータス更新

```http
PATCH /orders/ORD-20260804-001/status
Content-Type: application/json
```

```json
{
  "status": "shipped"
}
```

### 注文更新

```http
PATCH /orders/ORD-20260804-001
Content-Type: application/json
```

```json
{
  "customerName": "佐藤 健一",
  "customerEmail": "sato@example.com",
  "shippingAddress": "東京都渋谷区神南1-1-1",
  "paymentMethod": "credit-card",
  "note": "午前中希望",
  "items": [
    {
      "productName": "ノートPCスタンド",
      "quantity": 1,
      "unitPrice": 4980
    }
  ]
}
```

### 成功レスポンス

```json
{
  "order": {
    "id": "ORD-20260804-001",
    "status": "shipped"
  }
}
```

### 400 レスポンス

```json
{
  "error": "Invalid order payload"
}
```

### 404 レスポンス

```json
{
  "error": "Order not found"
}
```

## 削除

```http
DELETE /orders/ORD-20260804-001
```

### 成功レスポンス

```json
{
  "deleted": true,
  "orderId": "ORD-20260804-001"
}
```

## 実装上の考え方

- 更新は全体更新とステータス更新を切り分ける
- 合計金額は更新時にサーバー側で再計算する
- 削除は副作用が大きいので、将来的には認可や監査ログを追加する
- Lambda は DB を直接持たず、状態は DynamoDB に委ねる

