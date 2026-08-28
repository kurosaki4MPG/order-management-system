import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { OrderFormValues } from "@/features/orders/schemas/order-schema"
import { handler } from "@/lambda/order-create-handler"

function parseJsonResponse<T>(body: string) {
  return JSON.parse(body) as T
}

const validOrderInput: OrderFormValues = {
  customerName: "山田 太郎",
  customerEmail: "yamada@example.com",
  shippingAddress: "東京都千代田区1-1-1",
  paymentMethod: "credit-card",
  items: [
    {
      productName: "商品A",
      quantity: 2,
      unitPrice: 1850,
    },
  ],
}

// 注文作成 Lambda が、正常系と異常系の両方で API 契約を保つことを確認する。
describe("order-create-handler", () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  // 正常な POST では注文 ID と合計金額を返すことを確認する。
  it("creates an order and returns a 201 response", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-27T12:34:56.000Z"))
    vi.spyOn(Math, "random").mockReturnValue(0.123)

    const result = await handler({
      body: JSON.stringify(validOrderInput),
      headers: {
        "x-request-id": "req-001",
      },
      httpMethod: "POST",
      path: "/api/orders",
    })

    // 作成成功時のステータスコードを確認する。
    expect(result.statusCode).toBe(201)
    // JSON レスポンスヘッダーを返すことを確認する。
    expect(result.headers["Content-Type"]).toBe("application/json; charset=utf-8")

    const body = parseJsonResponse<{
      order: { id: string; orderedAt: string; totalAmount: number }
      requestId?: string
    }>(result.body)

    // リクエスト ID がレスポンスに含まれることを確認する。
    expect(body.requestId).toBe("req-001")
    // 注文 ID が日付ベースで生成されることを確認する。
    expect(body.order.id).toBe("ORD-20260827-123456-123")
    // 合計金額がサーバー側で再計算されることを確認する。
    expect(body.order.totalAmount).toBe(3700)
    // 受付日時が現在時刻を使っていることを確認する。
    expect(body.order.orderedAt).toBe("2026-08-27T12:34:56.000Z")
  })

  // 不正な入力は 400 と validation 失敗を返すことを確認する。
  it("rejects invalid order payloads with a 400 response", async () => {
    const result = await handler({
      body: JSON.stringify({}),
      httpMethod: "POST",
      path: "/api/orders",
    })

    // バリデーションエラーとして 400 を返すことを確認する。
    expect(result.statusCode).toBe(400)

    const body = parseJsonResponse<{ error: string; issues: Record<string, string[]> }>(
      result.body
    )

    // エラー種別が入力不備であることを確認する。
    expect(body.error).toBe("Invalid order")
    // 必須項目のエラーが返ることを確認する。
    expect(body.issues.customerName).toBeDefined()
  })

  // POST 以外は受け付けないことを確認する。
  it("returns 405 for unsupported methods", async () => {
    const result = await handler({
      httpMethod: "GET",
      path: "/api/orders",
    })

    // GET が拒否されることを確認する。
    expect(result.statusCode).toBe(405)
    // メソッド不許可のエラー本文を返すことを確認する。
    expect(parseJsonResponse<{ error: string }>(result.body).error).toBe(
      "Method Not Allowed"
    )
  })

  // httpMethod が無いときは POST として扱うことを確認する。
  it("defaults to POST when the method is omitted", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-27T12:34:56.000Z"))
    vi.spyOn(Math, "random").mockReturnValue(0.123)

    const result = await handler({
      body: JSON.stringify(validOrderInput),
      path: "/api/orders",
    })

    // 既定動作でも注文が作成されることを確認する。
    expect(result.statusCode).toBe(201)
  })

  // 壊れた JSON でも入力不備として扱うことを確認する。
  it("returns 400 when the body is invalid JSON", async () => {
    const result = await handler({
      body: "{broken-json",
      httpMethod: "POST",
      path: "/api/orders",
    })

    // JSON 解析失敗は入力不備として返ることを確認する。
    expect(result.statusCode).toBe(400)
  })
})
