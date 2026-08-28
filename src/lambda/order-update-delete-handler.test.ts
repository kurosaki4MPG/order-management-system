import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  deleteOrderMock,
  getOrderByIdMock,
  updateOrderMock,
  updateOrderStatusMock,
} = vi.hoisted(() => ({
  deleteOrderMock: vi.fn(),
  getOrderByIdMock: vi.fn(),
  updateOrderMock: vi.fn(),
  updateOrderStatusMock: vi.fn(),
}))

vi.mock("@/features/orders/services/order-service", () => ({
  deleteOrder: deleteOrderMock,
  getOrderById: getOrderByIdMock,
  updateOrder: updateOrderMock,
  updateOrderStatus: updateOrderStatusMock,
}))

import { handler } from "@/lambda/order-update-delete-handler"
import type { Order } from "@/features/orders/types/order"

function parseJsonResponse<T>(body: string) {
  return JSON.parse(body) as T
}

const sampleOrder: Order = {
  id: "ORD-001",
  orderedAt: "2026-08-27T00:00:00.000Z",
  customerName: "山田 太郎",
  customerEmail: "yamada@example.com",
  shippingAddress: "東京都千代田区1-1-1",
  status: "pending",
  paymentMethod: "credit-card",
  items: [
    {
      productName: "商品A",
      quantity: 1,
      unitPrice: 1200,
    },
  ],
  totalAmount: 1200,
}

// 注文更新/削除 Lambda が、PATCH と DELETE の契約を正しく守ることを確認する。
describe("order-update-delete-handler", () => {
  beforeEach(() => {
    deleteOrderMock.mockReset()
    getOrderByIdMock.mockReset()
    updateOrderMock.mockReset()
    updateOrderStatusMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ステータス更新の PATCH が正しく処理されることを確認する。
  it("updates order status with PATCH", async () => {
    getOrderByIdMock.mockResolvedValue(sampleOrder)
    updateOrderStatusMock.mockResolvedValue({
      ...sampleOrder,
      status: "shipped",
    })

    const result = await handler({
      body: JSON.stringify({ status: "shipped" }),
      httpMethod: "PATCH",
      path: "/api/orders/ORD-001",
    })

    // PATCH 成功時は 200 を返すことを確認する。
    expect(result.statusCode).toBe(200)
    // 既存注文の確認後にステータス更新が呼ばれることを確認する。
    expect(getOrderByIdMock).toHaveBeenCalledWith("ORD-001")
    expect(updateOrderStatusMock).toHaveBeenCalledWith("ORD-001", "shipped")
    // 更新後の注文がレスポンスに含まれることを確認する。
    expect(parseJsonResponse<{ order: Order }>(result.body).order.status).toBe(
      "shipped"
    )
  })

  // 注文本体の PATCH が正しく処理されることを確認する。
  it("updates the full order payload with PATCH", async () => {
    getOrderByIdMock.mockResolvedValue(sampleOrder)
    updateOrderMock.mockResolvedValue({
      ...sampleOrder,
      customerName: "山田 花子",
    })

    const result = await handler({
      body: JSON.stringify({
        customerName: "山田 花子",
        customerEmail: "hanako@example.com",
        shippingAddress: "東京都港区1-2-3",
        paymentMethod: "bank-transfer",
        items: [
          {
            productName: "商品B",
            quantity: 2,
            unitPrice: 900,
          },
        ],
      }),
      httpMethod: "PATCH",
      path: "/api/orders/ORD-001",
    })

    // 注文本体更新が成功することを確認する。
    expect(result.statusCode).toBe(200)
    // 更新 API に正しいデータが渡ることを確認する。
    expect(updateOrderMock).toHaveBeenCalledWith(
      "ORD-001",
      expect.objectContaining({
        customerName: "山田 花子",
      })
    )
  })

  // 対象注文が無い場合は 404 を返すことを確認する。
  it("returns 404 when the target order does not exist", async () => {
    getOrderByIdMock.mockResolvedValue(undefined)

    const result = await handler({
      body: JSON.stringify({ status: "shipped" }),
      httpMethod: "PATCH",
      path: "/api/orders/ORD-NOT-FOUND",
    })

    // 対象未存在は 404 になることを確認する。
    expect(result.statusCode).toBe(404)
    expect(parseJsonResponse<{ error: string }>(result.body).error).toBe(
      "Order not found"
    )
  })

  // 不正な PATCH 本文は 400 を返すことを確認する。
  it("returns 400 for invalid PATCH payloads", async () => {
    getOrderByIdMock.mockResolvedValue(sampleOrder)

    const result = await handler({
      body: JSON.stringify({ status: "" }),
      httpMethod: "PATCH",
      path: "/api/orders/ORD-001",
    })

    // 不正な入力は 400 に変換されることを確認する。
    expect(result.statusCode).toBe(400)
    expect(parseJsonResponse<{ error: string }>(result.body).error).toBe(
      "Invalid order payload"
    )
  })

  // DELETE が削除結果を返すことを確認する。
  it("deletes an order with DELETE", async () => {
    deleteOrderMock.mockResolvedValue(true)

    const result = await handler({
      httpMethod: "DELETE",
      path: "/api/orders/ORD-001",
    })

    // 削除成功は 200 を返すことを確認する。
    expect(result.statusCode).toBe(200)
    // 削除 API が対象 ID で呼ばれることを確認する。
    expect(deleteOrderMock).toHaveBeenCalledWith("ORD-001")
    // レスポンスに削除フラグが入ることを確認する。
    expect(parseJsonResponse<{ deleted: boolean; orderId: string }>(result.body))
      .toEqual({
        deleted: true,
        orderId: "ORD-001",
      })
  })

  // GET/PUT などは許可しないことを確認する。
  it("returns 405 for unsupported methods", async () => {
    const result = await handler({
      httpMethod: "PUT",
      path: "/api/orders/ORD-001",
    })

    // 未対応メソッドは 405 になることを確認する。
    expect(result.statusCode).toBe(405)
  })

  // httpMethod が無いときは PATCH として扱うことを確認する。
  it("defaults to PATCH when the method is omitted", async () => {
    getOrderByIdMock.mockResolvedValue(sampleOrder)
    updateOrderStatusMock.mockResolvedValue({
      ...sampleOrder,
      status: "shipped",
    })

    const result = await handler({
      body: JSON.stringify({ status: "shipped" }),
      path: "/api/orders/ORD-001",
    })

    // 既定動作でも PATCH として扱われることを確認する。
    expect(result.statusCode).toBe(200)
    expect(updateOrderStatusMock).toHaveBeenCalledWith("ORD-001", "shipped")
  })

  // pathParameters の id が優先されることを確認する。
  it("prefers pathParameters.id when present", async () => {
    deleteOrderMock.mockResolvedValue(true)

    const result = await handler({
      httpMethod: "DELETE",
      path: "/api/orders/something-else",
      pathParameters: {
        id: "ORD-002",
      },
    })

    // pathParameters の id が削除対象になることを確認する。
    expect(deleteOrderMock).toHaveBeenCalledWith("ORD-002")
    expect(result.statusCode).toBe(200)
  })

  // 注文 ID が無い DELETE は 400 を返すことを確認する。
  it("returns 400 when DELETE has no order id", async () => {
    const result = await handler({
      httpMethod: "DELETE",
      path: "",
    })

    // ID 不足は 400 として返ることを確認する。
    expect(result.statusCode).toBe(400)
  })
})
