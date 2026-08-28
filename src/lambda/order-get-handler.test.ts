import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { getOrderByIdMock, searchOrdersMock } = vi.hoisted(() => ({
  getOrderByIdMock: vi.fn(),
  searchOrdersMock: vi.fn(),
}))

vi.mock("@/features/orders/services/order-service", () => ({
  getOrderById: getOrderByIdMock,
  searchOrders: searchOrdersMock,
}))

import { handler } from "@/lambda/order-get-handler"
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

// 注文取得 Lambda が、一覧・詳細・異常系で正しい HTTP 契約を返すことを確認する。
describe("order-get-handler", () => {
  beforeEach(() => {
    getOrderByIdMock.mockReset()
    searchOrdersMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // 一覧取得はフィルターを正規化して検索結果を返すことを確認する。
  it("returns an order list for collection paths", async () => {
    searchOrdersMock.mockResolvedValue([sampleOrder])

    const result = await handler({
      httpMethod: "GET",
      path: "/api/orders",
      queryStringParameters: {
        paymentMethod: "all",
        query: "web",
        status: "all",
      },
    })

    // 一覧取得が成功ステータスになることを確認する。
    expect(result.statusCode).toBe(200)
    // フィルターが正規化されて service に渡ることを確認する。
    expect(searchOrdersMock).toHaveBeenCalledWith({
      paymentMethod: null,
      query: "web",
      status: null,
    })

    const body = parseJsonResponse<{ orders: Order[]; total: number }>(result.body)
    // 注文一覧がレスポンスに含まれることを確認する。
    expect(body.orders).toEqual([sampleOrder])
    // 件数が一致することを確認する。
    expect(body.total).toBe(1)
  })

  // 詳細取得は注文 ID に応じて単票を返すことを確認する。
  it("returns a single order for detail paths", async () => {
    getOrderByIdMock.mockResolvedValue(sampleOrder)

    const result = await handler({
      httpMethod: "GET",
      path: "/api/orders/ORD-001",
    })

    // 詳細取得が成功ステータスになることを確認する。
    expect(result.statusCode).toBe(200)
    // 注文 ID が service に渡ることを確認する。
    expect(getOrderByIdMock).toHaveBeenCalledWith("ORD-001")
    // レスポンス本文が詳細形式であることを確認する。
    expect(parseJsonResponse<{ order: Order }>(result.body).order).toEqual(
      sampleOrder
    )
  })

  // 対象注文が無い場合は 404 を返すことを確認する。
  it("returns 404 when the order does not exist", async () => {
    getOrderByIdMock.mockResolvedValue(undefined)

    const result = await handler({
      httpMethod: "GET",
      path: "/api/orders/ORD-NOT-FOUND",
    })

    // 見つからない注文は 404 で返ることを確認する。
    expect(result.statusCode).toBe(404)
    expect(parseJsonResponse<{ error: string }>(result.body).error).toBe(
      "Order not found"
    )
  })

  // 注文 ID が無い場合は 400 を返すことを確認する。
  it("returns 400 when no order id is available", async () => {
    const result = await handler({
      httpMethod: "GET",
    })

    // ID 不足は 400 になることを確認する。
    expect(result.statusCode).toBe(400)
    expect(parseJsonResponse<{ error: string }>(result.body).error).toBe(
      "Order id is required"
    )
  })

  // GET 以外は拒否することを確認する。
  it("returns 405 for non-GET methods", async () => {
    const result = await handler({
      httpMethod: "POST",
      path: "/api/orders",
    })

    // GET 以外はメソッド不許可として返ることを確認する。
    expect(result.statusCode).toBe(405)
  })

  // httpMethod が無いときは GET として扱うことを確認する。
  it("defaults to GET when the method is omitted", async () => {
    searchOrdersMock.mockResolvedValue([sampleOrder])

    const result = await handler({
      path: "/",
      queryStringParameters: {},
    })

    // 既定動作でも一覧取得として扱われることを確認する。
    expect(result.statusCode).toBe(200)
  })

  // pathParameters の id が優先されることを確認する。
  it("prefers pathParameters.id when present", async () => {
    getOrderByIdMock.mockResolvedValue(sampleOrder)

    const result = await handler({
      httpMethod: "GET",
      path: "/api/orders/some-other-segment",
      pathParameters: {
        id: "ORD-XYZ",
      },
    })

    // pathParameters の id が注文取得に使われることを確認する。
    expect(getOrderByIdMock).toHaveBeenCalledWith("ORD-XYZ")
    expect(result.statusCode).toBe(200)
  })
})
