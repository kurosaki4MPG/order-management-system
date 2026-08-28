import { describe, expect, it, vi } from "vitest"

const repoMocks = vi.hoisted(() => ({
  create: vi.fn(),
  delete: vi.fn(),
  getById: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
}))

vi.mock("@/features/orders/repositories/dynamo-db-order-repository", () => ({
  dynamoDbOrderRepository: repoMocks,
}))

import type { OrderFormValues } from "@/features/orders/schemas/order-schema"
import type { Order } from "@/features/orders/types/order"
import {
  createOrder,
  deleteOrder,
  getOrderById,
  getOrders,
  searchOrders,
  updateOrder,
  updateOrderStatus,
} from "@/features/orders/services/order-service"

const sampleOrder: Order = {
  id: "ORD-001",
  orderedAt: "2026-08-27T00:00:00.000Z",
  customerName: "山田 太郎",
  customerEmail: "yamada@example.com",
  shippingAddress: "東京都千代田区1-1-1",
  status: "pending",
  paymentMethod: "credit-card",
  items: [],
  totalAmount: 0,
}

const sampleValues: OrderFormValues = {
  customerName: "山田 太郎",
  customerEmail: "yamada@example.com",
  shippingAddress: "東京都千代田区1-1-1",
  paymentMethod: "credit-card",
  items: [],
}

// Service 層のラッパーが、Repository の公開契約をそのまま届けることを確認する。
describe("order-service", () => {
  // 注文一覧取得が Repository にそのまま委譲されることを確認する。
  it("delegates getOrders to the repository", async () => {
    repoMocks.list.mockResolvedValueOnce([sampleOrder])

    await expect(getOrders()).resolves.toEqual([sampleOrder])
    expect(repoMocks.list).toHaveBeenCalledWith()
  })

  // 条件付き検索が Repository にそのまま渡ることを確認する。
  it("delegates searchOrders to the repository", async () => {
    repoMocks.list.mockResolvedValueOnce([sampleOrder])

    await expect(
      searchOrders({
        query: "山田",
        status: "pending",
        paymentMethod: "credit-card",
      })
    ).resolves.toEqual([sampleOrder])
    expect(repoMocks.list).toHaveBeenCalledWith({
      query: "山田",
      status: "pending",
      paymentMethod: "credit-card",
    })
  })

  // 1件取得が Repository にそのまま委譲されることを確認する。
  it("delegates getOrderById to the repository", async () => {
    repoMocks.getById.mockResolvedValueOnce(sampleOrder)

    await expect(getOrderById("ORD-001")).resolves.toEqual(sampleOrder)
    expect(repoMocks.getById).toHaveBeenCalledWith("ORD-001")
  })

  // ステータス更新が Repository にそのまま委譲されることを確認する。
  it("delegates updateOrderStatus to the repository", async () => {
    repoMocks.updateStatus.mockResolvedValueOnce({
      ...sampleOrder,
      status: "shipped",
    })

    await expect(updateOrderStatus("ORD-001", "shipped")).resolves.toMatchObject({
      status: "shipped",
    })
    expect(repoMocks.updateStatus).toHaveBeenCalledWith("ORD-001", "shipped")
  })

  // フル更新が Repository にそのまま委譲されることを確認する。
  it("delegates updateOrder to the repository", async () => {
    repoMocks.update.mockResolvedValueOnce({
      ...sampleOrder,
      customerName: "佐藤 花子",
    })

    await expect(updateOrder("ORD-001", sampleValues)).resolves.toMatchObject({
      customerName: "佐藤 花子",
    })
    expect(repoMocks.update).toHaveBeenCalledWith("ORD-001", sampleValues)
  })

  // 削除が Repository にそのまま委譲されることを確認する。
  it("delegates deleteOrder to the repository", async () => {
    repoMocks.delete.mockResolvedValueOnce(true)

    await expect(deleteOrder("ORD-001")).resolves.toBe(true)
    expect(repoMocks.delete).toHaveBeenCalledWith("ORD-001")
  })

  // 作成が Repository にそのまま委譲されることを確認する。
  it("delegates createOrder to the repository", async () => {
    repoMocks.create.mockResolvedValueOnce(sampleOrder)

    await expect(createOrder(sampleValues)).resolves.toEqual(sampleOrder)
    expect(repoMocks.create).toHaveBeenCalledWith(sampleValues)
  })
})
