import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sendMock = vi.fn()

vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>()

  return {
    ...actual,
    randomUUID: vi.fn(() => "uuid-test-001"),
  }
})

vi.mock("@aws-sdk/client-eventbridge", () => {
  class EventBridgeClient {
    send = sendMock
  }

  class PutEventsCommand {
    input: unknown

    constructor(input: unknown) {
      this.input = input
    }
  }

  return {
    EventBridgeClient,
    PutEventsCommand,
  }
})

describe("order-event-publisher", () => {
  beforeEach(() => {
    process.env.ORDER_EVENTS_BUS_NAME = "oms-dev-order-events"
    sendMock.mockResolvedValue({})
  })

  afterEach(() => {
    delete process.env.ORDER_EVENTS_BUS_NAME
    sendMock.mockReset()
    vi.useRealTimers()
  })

  // EventBridge に投げる注文作成イベントが、注文スナップショットとして組み立てられることを確認する。
  it("publishes created order events", async () => {
    const { publishOrderCreated } = await import(
      "@/features/orders/events/order-event-publisher"
    )

    await publishOrderCreated({
      id: "ORD-TEST-001",
      orderedAt: "2026-08-27T00:00:00.000Z",
      customerName: "山田 太郎",
      customerEmail: "yamada@example.com",
      shippingAddress: "東京都千代田区1-1-1",
      status: "pending",
      paymentMethod: "credit-card",
      items: [],
      totalAmount: 0,
    })

    // EventBridge への送信が 1 回だけ発生することを確認する。
    expect(sendMock).toHaveBeenCalledTimes(1)
    const command = sendMock.mock.calls[0]?.[0] as { input: { Entries: Array<{ Detail: string; DetailType: string; EventBusName: string; Source: string }> } }
    // 送信先、イベント種別、source が想定どおりであることを確認する。
    expect(command.input.Entries[0]).toMatchObject({
      DetailType: "OrderCreated",
      EventBusName: "oms-dev-order-events",
      Source: "oms.orders",
    })
    // detail に注文スナップショットが含まれることを確認する。
    expect(JSON.parse(command.input.Entries[0].Detail)).toMatchObject({
      customerName: "山田 太郎",
      orderId: "ORD-TEST-001",
      version: 1,
    })
  })

  // 注文ステータス変更は、更新時刻を持つ別イベントとして送られることを確認する。
  it("publishes status changed events with the current timestamp", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-27T03:00:00.000Z"))

    const { publishOrderStatusChanged } = await import(
      "@/features/orders/events/order-event-publisher"
    )

    await publishOrderStatusChanged({
      id: "ORD-TEST-001",
      orderedAt: "2026-08-27T00:00:00.000Z",
      customerName: "山田 太郎",
      customerEmail: "yamada@example.com",
      shippingAddress: "東京都千代田区1-1-1",
      status: "shipped",
      paymentMethod: "credit-card",
      items: [],
      totalAmount: 0,
    })

    const command = sendMock.mock.calls[0]?.[0] as { input: { Entries: Array<{ Detail: string; DetailType: string }> } }
    // ステータス変更イベントとして送信されていることを確認する。
    expect(command.input.Entries[0]).toMatchObject({
      DetailType: "OrderStatusChanged",
    })
    // updatedAt に現在時刻が入ることを確認する。
    expect(JSON.parse(command.input.Entries[0].Detail)).toMatchObject({
      orderId: "ORD-TEST-001",
      status: "shipped",
      updatedAt: "2026-08-27T03:00:00.000Z",
    })
  })

  // 更新イベントは作成イベントと同じスナップショットを送ることを確認する。
  it("publishes updated order events", async () => {
    const { publishOrderUpdated } = await import(
      "@/features/orders/events/order-event-publisher"
    )

    await publishOrderUpdated({
      id: "ORD-TEST-002",
      orderedAt: "2026-08-27T04:00:00.000Z",
      customerName: "佐藤 花子",
      customerEmail: "sato@example.com",
      shippingAddress: "東京都港区1-2-3",
      status: "processing",
      paymentMethod: "bank-transfer",
      items: [],
      totalAmount: 1200,
    })

    // 更新イベントも 1 回だけ EventBridge に送ることを確認する。
    expect(sendMock).toHaveBeenCalledTimes(1)
    const command = sendMock.mock.calls[0]?.[0] as {
      input: { Entries: Array<{ Detail: string; DetailType: string }> }
    }
    // 更新イベントの種別が正しいことを確認する。
    expect(command.input.Entries[0]).toMatchObject({
      DetailType: "OrderUpdated",
    })
    // 更新時の注文スナップショットが detail に含まれることを確認する。
    expect(JSON.parse(command.input.Entries[0].Detail)).toMatchObject({
      customerName: "佐藤 花子",
      orderId: "ORD-TEST-002",
      paymentMethod: "bank-transfer",
      version: 1,
    })
  })

  // 削除イベントは削除日時を持つ最小限の payload になることを確認する。
  it("publishes deleted order events", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-27T05:00:00.000Z"))

    const { publishOrderDeleted } = await import(
      "@/features/orders/events/order-event-publisher"
    )

    await publishOrderDeleted("ORD-TEST-003")

    const command = sendMock.mock.calls[0]?.[0] as {
      input: { Entries: Array<{ Detail: string; DetailType: string }> }
    }
    // 削除イベントの種別が正しいことを確認する。
    expect(command.input.Entries[0]).toMatchObject({
      DetailType: "OrderDeleted",
    })
    // 削除日時と注文 ID が payload に含まれることを確認する。
    expect(JSON.parse(command.input.Entries[0].Detail)).toMatchObject({
      deletedAt: "2026-08-27T05:00:00.000Z",
      orderId: "ORD-TEST-003",
      version: 1,
    })
  })

  // 必須環境変数が無い場合は送信前に失敗することを確認する。
  it("throws when ORDER_EVENTS_BUS_NAME is missing", async () => {
    delete process.env.ORDER_EVENTS_BUS_NAME

    const { publishOrderCreated } = await import(
      "@/features/orders/events/order-event-publisher"
    )

    await expect(
      publishOrderCreated({
        id: "ORD-TEST-001",
        orderedAt: "2026-08-27T00:00:00.000Z",
        customerName: "山田 太郎",
        customerEmail: "yamada@example.com",
        shippingAddress: "東京都千代田区1-1-1",
        status: "pending",
        paymentMethod: "credit-card",
        items: [],
        totalAmount: 0,
      })
    ).rejects.toThrow("ORDER_EVENTS_BUS_NAME is required")
  })
})
