# フロントエンド API 通信一覧

このドキュメントは、フロントエンドから呼び出す API の一覧です。
現在の実装では、注文一覧取得、注文詳細取得、注文登録、注文ステータス取得・更新 API が実装済みです。

## 共通仕様

- Base URL: `NEXT_PUBLIC_API_BASE_URL` が設定されていればそれを優先し、未設定時は同一オリジン
- Content-Type: `application/json`
- 認証: 未実装
- 永続化: DynamoDB
- データソース: `src/features/orders/services/order-service.ts` 経由で DynamoDB の注文データを扱う

フロントエンドの通信層は、`src/lib/api-client.ts` の共通 JSON クライアントと `src/features/orders/api/order-api.ts` の機能別 API に分離している。

React Query は `src/features/orders/api/order-queries.ts` で使い、一覧・詳細・ステータスの取得と、注文登録・ステータス更新後のキャッシュ無効化をまとめて扱う。

注文一覧は `query` / `status` / `paymentMethod` をクエリパラメータとして渡し、フロントエンド側の再フィルタではなくサーバー検索結果をそのまま表示する。

## 実装済み API

| No | 画面 | 用途 | Method | Endpoint | 実装ファイル | 呼び出し元 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 注文一覧 | 注文一覧取得 | `GET` | `/api/orders` | `src/app/api/orders/route.ts` | 現時点では検証用 |
| 2 | 注文詳細 | 注文詳細取得 | `GET` | `/api/orders/{id}` | `src/app/api/orders/[id]/route.ts` | 現時点では検証用 |
| 3 | 注文登録 | 注文登録 | `POST` | `/api/orders` | `src/app/api/orders/route.ts` | `src/features/orders/components/order-form.tsx` |
| 4 | 注文詳細 | 注文ステータス取得 | `GET` | `/api/orders/{id}/status` | `src/app/api/orders/[id]/status/route.ts` | 現時点では検証用 |
| 5 | 注文詳細 | 注文ステータス更新 | `PATCH` | `/api/orders/{id}/status` | `src/app/api/orders/[id]/status/route.ts` | `src/features/orders/components/order-status-manager.tsx` |

## 1. 注文一覧取得

### Request

```http
GET /api/orders?query=Web%E3%82%AB%E3%83%A1%E3%83%A9&status=processing&paymentMethod=credit-card
```

### Query Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `query` | `string` | No | 注文番号、顧客名、メール、住所、商品名の部分一致検索 |
| `status` | `OrderStatus` \| `all` | No | ステータス絞り込み |
| `paymentMethod` | `PaymentMethod` \| `all` | No | 支払い方法絞り込み |

### Response 200

```json
{
  "orders": [],
  "total": 0
}
```

## 2. 注文詳細取得

### Request

```http
GET /api/orders/ORD-20260804-001
```

### Response 200

```json
{
  "order": {
    "id": "ORD-20260804-001",
    "status": "pending"
  }
}
```

### Response 404

```json
{
  "error": "Order not found"
}
```

## 3. 注文登録

### Request

```http
POST /api/orders
Content-Type: application/json
```

```json
{
  "customerName": "佐藤 健一",
  "customerEmail": "sato@example.com",
  "shippingAddress": "東京都渋谷区神南1-1-1",
  "paymentMethod": "credit-card",
  "note": "",
  "items": [
    {
      "productName": "ノートPCスタンド",
      "quantity": 1,
      "unitPrice": 4980
    }
  ]
}
```

### Response 201

```json
{
  "order": {
    "id": "ORD-20260805-009",
    "status": "pending",
    "totalAmount": 4980
  }
}
```

### Response 400

```json
{
  "error": "Invalid order",
  "issues": {
    "customerEmail": ["メールアドレスの形式で入力してください"]
  }
}

```

## 4. 注文ステータス取得

### Request

```http
GET /api/orders/ORD-20260804-001/status
```

### Path Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | 注文番号 |

### Response 200

```json
{
  "status": "pending"
}
```

### Response 404

```json
{
  "error": "Order not found"
}
```

## 5. 注文ステータス更新

### Request

```http
PATCH /api/orders/ORD-20260804-001/status
Content-Type: application/json
```

```json
{
  "status": "shipped"
}
```

### Path Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | 注文番号 |

### Request Body

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | `OrderStatus` | Yes | 変更後ステータス |

### OrderStatus

| Value | Label |
| --- | --- |
| `pending` | 処理待ち |
| `processing` | 処理中 |
| `shipped` | 発送済み |
| `delivered` | 完了 |
| `canceled` | キャンセル |

### Response 200

```json
{
  "order": {
    "id": "ORD-20260804-001",
    "orderedAt": "2026-08-04T09:12:00+09:00",
    "customerName": "佐藤 健一",
    "customerEmail": "sato@example.com",
    "shippingAddress": "東京都渋谷区神南1-1-1",
    "status": "shipped",
    "paymentMethod": "credit-card",
    "items": [
      {
        "productName": "ノートPCスタンド",
        "quantity": 1,
        "unitPrice": 4980
      }
    ],
    "totalAmount": 7540
  }
}
```

### Response 400

```json
{
  "error": "Invalid order status",
  "issues": {
    "status": ["Invalid option: expected one of ..."]
  }
}
```

### Response 404

```json
{
  "error": "Order not found"
}
```

## フロントエンド呼び出し例

```ts
const response = await fetch(`/api/orders/${orderId}/status`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    status: selectedStatus,
  }),
});

if (!response.ok) {
  throw new Error("ステータス更新に失敗しました。");
}

const data = (await response.json()) as {
  order: {
    status: OrderStatus;
  };
};
```

## 未実装だが今後追加予定の API

| No | 画面 | 用途 | Method | Endpoint | 備考 |
| --- | --- | --- | --- | --- | --- |
| 1 | 注文詳細 | 注文キャンセル | `PATCH` | `/api/orders/{id}/cancel` | ステータス更新 API に統合する案もあり |
| 2 | 注文一覧 | 注文削除 | `DELETE` | `/api/orders/{id}` | 管理者操作として必要になった段階で追加 |

## 関連ファイル

| File | Role |
| --- | --- |
| `src/lib/api-client.ts` | JSON API 呼び出しとエラー標準化 |
| `src/features/orders/api/order-api.ts` | 注文関連 API のフロントエンド通信層 |
| `src/app/api/orders/route.ts` | 注文一覧取得・注文登録 API |
| `src/app/api/orders/[id]/route.ts` | 注文詳細取得 API |
| `src/app/api/orders/[id]/status/route.ts` | 注文ステータス取得・更新 API |
| `src/features/orders/components/order-form.tsx` | 注文登録 API の呼び出し元 |
| `src/features/orders/components/order-status-manager.tsx` | ステータス更新 API の呼び出し元 |
| `src/features/orders/schemas/order-schema.ts` | API request body validation |
| `src/features/orders/types/order.ts` | 注文関連の型定義 |
| `src/features/orders/services/order-service.ts` | 注文データの取得・更新 |
