# STEP18 注文登録API

このステップでは、注文登録 Lambda の最小実装を作る。

## 目的

- `POST /orders` 相当の API を Lambda で受ける
- 入力検証を API の入口で行う
- 合計金額をサーバー側で計算する
- 生成した注文 ID と作成日時を返す

## 実装ファイル

- `src/lambda/order-create-handler.ts`

## リクエスト

```http
POST /orders
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

## 成功レスポンス

```json
{
  "order": {
    "id": "ORD-20260820-120102-123",
    "orderedAt": "2026-08-20T12:01:02.345Z",
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

## エラーレスポンス

### 入力不備

```json
{
  "error": "Invalid order",
  "issues": {
    "customerEmail": ["メールアドレスの形式で入力してください"]
  }
}
```

### メソッド不正

```json
{
  "error": "Method Not Allowed"
}
```

## 実装上の考え方

- バリデーションは Lambda の入口で行う
- `status` は必ず `pending` で開始する
- `totalAmount` はクライアントから受け取らず、サーバー側で計算する
- 注文 ID は Lambda 側で生成する

## Next.js との役割分担

- Next.js は入力UIと送信を担当する
- Lambda は保存前の検証と注文作成を担当する
- 後続の STEP22 以降で DynamoDB に保存する

