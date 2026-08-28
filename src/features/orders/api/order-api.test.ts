import { afterEach, describe, expect, it, vi } from "vitest"

import type { OrderFormValues } from "@/features/orders/schemas/order-schema"
import { requestJson } from "@/lib/api-client"
import {
  createOrder,
  deleteOrder,
  fetchOrder,
  fetchOrderStatus,
  fetchOrders,
  updateOrderStatus,
} from "@/features/orders/api/order-api"

vi.mock("@/lib/api-client", () => {
  const requestJsonMock = vi.fn()

  return {
    ApiError: class ApiError extends Error {},
    requestJson: requestJsonMock,
  }
})

const requestJsonMock = vi.mocked(requestJson)

// API 関数が、正しいエンドポイントと HTTP メソッドへ変換することを確認する。
describe("order-api", () => {
  afterEach(() => {
    requestJsonMock.mockReset()
  })

  // 一覧取得はクエリをそのまま API に渡すことを確認する。
  it("fetchOrders forwards list filters to /api/orders", async () => {
    requestJsonMock.mockResolvedValue({ orders: [], total: 0 })

    await fetchOrders({
      paymentMethod: "credit-card",
      query: "web",
      status: "processing",
    })

    // 一覧用クエリが API 層にそのまま渡ることを確認する。
    expect(requestJsonMock).toHaveBeenCalledWith("/api/orders", {
      query: {
        paymentMethod: "credit-card",
        query: "web",
        status: "processing",
      },
    })
  })

  // 個別取得は ID を URL エンコードして使うことを確認する。
  it("fetchOrder requests the order detail endpoint", async () => {
    requestJsonMock.mockResolvedValue({
      order: { id: "ORD-001" },
    })

    await fetchOrder("ORD/001")

    // 注文 ID が URL エンコードされて詳細エンドポイントに渡ることを確認する。
    expect(requestJsonMock).toHaveBeenCalledWith("/api/orders/ORD%2F001")
  })

  // ステータス取得は専用エンドポイントへ向ける。
  it("fetchOrderStatus requests the status endpoint", async () => {
    requestJsonMock.mockResolvedValue({
      status: "processing",
    })

    await fetchOrderStatus("ORD-001")

    // ステータス取得が専用エンドポイントを呼ぶことを確認する。
    expect(requestJsonMock).toHaveBeenCalledWith("/api/orders/ORD-001/status")
  })

  // 注文登録は POST でフォーム値をそのまま送る。
  it("createOrder posts order values and returns the created order", async () => {
    const values = {
      customerName: "山田 太郎",
      customerEmail: "yamada@example.com",
      shippingAddress: "東京都千代田区1-1-1",
      paymentMethod: "credit-card",
      items: [
        {
          productName: "商品A",
          quantity: 1,
          unitPrice: 1200,
        },
      ],
    } satisfies OrderFormValues

    requestJsonMock.mockResolvedValue({
      order: {
        id: "ORD-001",
        status: "pending",
        totalAmount: 1200,
      },
    })

    await expect(createOrder(values)).resolves.toMatchObject({ id: "ORD-001" })
    // 注文登録が POST でフォーム値をそのまま送ることを確認する。
    expect(requestJsonMock).toHaveBeenCalledWith("/api/orders", {
      body: values,
      method: "POST",
    })
  })

  // ステータス更新は PATCH で専用 payload を送る。
  it("updateOrderStatus patches the status endpoint", async () => {
    requestJsonMock.mockResolvedValue({
      order: { id: "ORD-001" },
    })

    await updateOrderStatus("ORD-001", "shipped")

    // ステータス更新が PATCH で status payload を送ることを確認する。
    expect(requestJsonMock).toHaveBeenCalledWith("/api/orders/ORD-001/status", {
      body: { status: "shipped" },
      method: "PATCH",
    })
  })

  // 削除は DELETE メソッドで注文 ID を送る。
  it("deleteOrder deletes the specified order", async () => {
    requestJsonMock.mockResolvedValue({
      deleted: true,
      orderId: "ORD-001",
    })

    await deleteOrder("ORD-001")

    // 削除が DELETE メソッドで対象注文 ID を送ることを確認する。
    expect(requestJsonMock).toHaveBeenCalledWith("/api/orders/ORD-001", {
      method: "DELETE",
    })
  })

  // 下位の requestJson が失敗した場合に、その例外をそのまま伝播することを確認する。
  it("propagates requestJson failures from fetchOrders", async () => {
    requestJsonMock.mockRejectedValue(new Error("network error"))

    await expect(fetchOrders()).rejects.toThrow("network error")
  })
})
