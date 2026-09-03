import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { OrderFormValues } from "@/features/orders/schemas/order-schema"

const {
  documentStore,
  randomUUIDMock,
  sendMock,
} = vi.hoisted(() => {
  const documentStore = new Map<string, Record<string, unknown>>()
  const randomUUIDMock = vi.fn()
  const sendMock = vi.fn(async (command: { input?: Record<string, unknown> }) => {
    const input = command.input ?? {}
    const commandName = command.constructor?.name

    function clone<T>(value: T): T {
      return JSON.parse(JSON.stringify(value)) as T
    }

    function readKey() {
      return String((input.Key as { orderId?: string } | undefined)?.orderId ?? "")
    }

    if (commandName === "PutCommand") {
      const item = clone((input.Item as Record<string, unknown>) ?? {})

      documentStore.set(readKey() || String(item.orderId ?? item.id ?? ""), item)
      return {}
    }

    if (commandName === "GetCommand") {
      const item = documentStore.get(readKey())
      return { Item: item ? clone(item) : undefined }
    }

    if (commandName === "ScanCommand") {
      return {
        Items: Array.from(documentStore.values()).map((item) => clone(item)),
      }
    }

    if (commandName === "DeleteCommand") {
      const key = readKey()
      const existed = documentStore.delete(key)
      return existed ? {} : {}
    }

    if (commandName === "UpdateCommand") {
      const key = readKey()
      const current = documentStore.get(key)

      if (!current) {
        const error = new Error("ConditionalCheckFailedException")
        ;(error as { name?: string }).name = "ConditionalCheckFailedException"
        throw error
      }

      const next = clone(current)
      const values = (input.ExpressionAttributeValues ??
        {}) as Record<string, unknown>

      if (input.ExpressionAttributeNames) {
        ;(next as Record<string, unknown>).status = values[":status"]
      } else {
        Object.assign(next, {
          customerEmail: values[":customerEmail"],
          customerName: values[":customerName"],
          items: values[":items"],
          paymentMethod: values[":paymentMethod"],
          shippingAddress: values[":shippingAddress"],
          totalAmount: values[":totalAmount"],
        })
      }

      documentStore.set(key, next)
      return { Attributes: clone(next) }
    }

    return {}
  })

  return { documentStore, randomUUIDMock, sendMock }
})

vi.mock("node:crypto", () => ({
  default: {
    randomUUID: randomUUIDMock,
  },
  randomUUID: randomUUIDMock,
}))

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class DynamoDBClient {},
}))

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DeleteCommand: class DeleteCommand {
    input: unknown

    constructor(input: unknown) {
      this.input = input
    }
  },
  DynamoDBDocumentClient: {
    from: () => ({
      send: sendMock,
    }),
  },
  GetCommand: class GetCommand {
    input: unknown

    constructor(input: unknown) {
      this.input = input
    }
  },
  PutCommand: class PutCommand {
    input: unknown

    constructor(input: unknown) {
      this.input = input
    }
  },
  ScanCommand: class ScanCommand {
    input: unknown

    constructor(input: unknown) {
      this.input = input
    }
  },
  UpdateCommand: class UpdateCommand {
    input: unknown

    constructor(input: unknown) {
      this.input = input
    }
  },
}))

function createOrderInput(overrides: Partial<OrderFormValues> = {}): OrderFormValues {
  return {
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
    ...overrides,
  }
}

function setSystemClock(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

// Service と Repository が、実装の境界を越えて正しくつながることを確認する。
describe("order-service integration", () => {
  beforeEach(() => {
    documentStore.clear()
    vi.resetModules()
    vi.stubEnv("ORDERS_TABLE_NAME", "oms-dev-orders")
    vi.stubEnv("AWS_REGION", "ap-northeast-1")
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  // 登録した注文が、そのまま取得できることを確認する。
  it("creates and retrieves an order through the repository", async () => {
    setSystemClock("2026-08-27T01:00:00.000Z")
    randomUUIDMock.mockReturnValue("550e8400-e29b-41d4-a716-446655440000")

    const { createOrder, getOrderById } = await import(
      "@/features/orders/services/order-service"
    )

    const created = await createOrder(createOrderInput())
    const fetched = await getOrderById(created.id)

    // 作成された注文 ID がそのまま取得できることを確認する。
    expect(fetched?.id).toBe(created.id)
    // 合計金額が保存時点の値のまま維持されることを確認する。
    expect(fetched?.totalAmount).toBe(1200)
    // UUID ベースの注文 ID になることを確認する。
    expect(created.id).toBe("ORD-20260827-550e8400")
  })

  // 検索条件を指定すると、Repository の絞り込みが効くことを確認する。
  it("filters orders through searchOrders", async () => {
    setSystemClock("2026-08-27T01:00:00.000Z")
    randomUUIDMock
      .mockReturnValueOnce("550e8400-e29b-41d4-a716-446655440000")
      .mockReturnValueOnce("660e8400-e29b-41d4-a716-446655440000")

    const { createOrder, searchOrders } = await import(
      "@/features/orders/services/order-service"
    )

    await createOrder(
      createOrderInput({
        paymentMethod: "credit-card",
        items: [
          {
            productName: "商品A",
            quantity: 1,
            unitPrice: 1200,
          },
        ],
      })
    )
    await createOrder(
      createOrderInput({
        customerName: "佐藤 花子",
        paymentMethod: "bank-transfer",
        items: [
          {
            productName: "別の商品",
            quantity: 2,
            unitPrice: 500,
          },
        ],
      })
    )

    const filtered = await searchOrders({
      paymentMethod: "credit-card",
      query: "商品A",
      status: "pending",
    })

    // 条件に一致した注文だけが返ることを確認する。
    expect(filtered).toHaveLength(1)
    // 支払い方法と検索語句の両方で絞り込めることを確認する。
    expect(filtered[0]?.customerName).toBe("山田 太郎")
  })

  // ステータス更新後に、更新内容が Repository に反映されることを確認する。
  it("updates order status and keeps other fields intact", async () => {
    setSystemClock("2026-08-27T01:00:00.000Z")
    randomUUIDMock.mockReturnValue("550e8400-e29b-41d4-a716-446655440000")

    const { createOrder, getOrderById, updateOrderStatus } = await import(
      "@/features/orders/services/order-service"
    )

    const created = await createOrder(createOrderInput())
    const updated = await updateOrderStatus(created.id, "shipped")
    const fetched = await getOrderById(created.id)

    // ステータスだけが更新されることを確認する。
    expect(updated?.status).toBe("shipped")
    // 他の情報は維持されることを確認する。
    expect(fetched?.customerName).toBe("山田 太郎")
    expect(fetched?.totalAmount).toBe(1200)
  })

  // フル更新後に、計算済み合計金額が更新されることを確認する。
  it("updates the full order payload and recalculates totals", async () => {
    setSystemClock("2026-08-27T01:00:00.000Z")
    randomUUIDMock.mockReturnValue("550e8400-e29b-41d4-a716-446655440000")

    const { createOrder, getOrderById, updateOrder } = await import(
      "@/features/orders/services/order-service"
    )

    const created = await createOrder(createOrderInput())
    const updated = await updateOrder(created.id, createOrderInput({
      customerName: "佐藤 花子",
      items: [
        {
          productName: "商品B",
          quantity: 2,
          unitPrice: 900,
        },
      ],
    }))
    const fetched = await getOrderById(created.id)

    // 更新後の顧客名が反映されることを確認する。
    expect(updated?.customerName).toBe("佐藤 花子")
    // 更新後の合計金額が再計算されることを確認する。
    expect(fetched?.totalAmount).toBe(1800)
  })

  // 削除後は、以後取得できないことを確認する。
  it("deletes an order and makes it unavailable", async () => {
    setSystemClock("2026-08-27T01:00:00.000Z")
    randomUUIDMock.mockReturnValue("550e8400-e29b-41d4-a716-446655440000")

    const { createOrder, deleteOrder, getOrderById } = await import(
      "@/features/orders/services/order-service"
    )

    const created = await createOrder(createOrderInput())
    const deleted = await deleteOrder(created.id)
    const fetched = await getOrderById(created.id)

    // 削除 API が true を返すことを確認する。
    expect(deleted).toBe(true)
    // 削除後は取得できなくなることを確認する。
    expect(fetched).toBeUndefined()
  })
})
