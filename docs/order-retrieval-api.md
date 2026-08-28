# STEP19 注文取得API

このステップでは、注文の一覧取得と詳細取得を Lambda で表現する。

## 目的

- 注文一覧を返す GET API を作る
- 注文詳細を返す GET API を作る
- フロントエンドの検索条件をそのまま受ける
- 404 の返し方を理解する

## 実装ファイル

- `src/lambda/order-get-handler.ts`

## 一覧取得

```http
GET /orders?query=web&status=processing&paymentMethod=credit-card
```

### 成功レスポンス

```json
{
  "orders": [],
  "total": 0
}
```

## 詳細取得

```http
GET /orders/ORD-20260804-001
```

### 成功レスポンス

```json
{
  "order": {
    "id": "ORD-20260804-001",
    "orderedAt": "2026-08-04T09:12:00+09:00",
    "customerName": "佐藤 健一",
    "customerEmail": "sato@example.com",
    "shippingAddress": "東京都渋谷区神南1-1-1",
    "status": "pending",
    "paymentMethod": "credit-card",
    "items": [
      {
        "productName": "ノートPCスタンド",
        "quantity": 1,
        "unitPrice": 4980
      }
    ],
    "totalAmount": 4980
  }
}
```

### 404 レスポンス

```json
{
  "error": "Order not found"
}
```

## 実装上の考え方

- 一覧取得と詳細取得は同じ Lambda にまとめてもよい
- 条件付き検索は Lambda の外ではなく API 側で処理する
- 返却データはフロントエンドがそのまま描画できる形にする
- 詳細が見つからない場合は `404` を返す

