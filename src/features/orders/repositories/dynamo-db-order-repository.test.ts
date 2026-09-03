import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const awsMocks = vi.hoisted(() => {
  const sendMock = vi.fn()
  const fromMock = vi.fn((client: unknown) => ({ client, send: sendMock }))

  class DynamoDBClient {
    config: { region: string }

    constructor(config: { region: string }) {
      this.config = config
    }
  }

  class DynamoDBDocumentClient {
    static from(client: unknown) {
      return fromMock(client)
    }
  }

  class PutCommand {
    input: unknown

    constructor(input: unknown) {
      this.input = input
    }
  }

  class DeleteCommand {
    input: unknown

    constructor(input: unknown) {
      this.input = input
    }
  }

  class GetCommand {
    input: unknown

    constructor(input: unknown) {
      this.input = input
    }
  }

  class ScanCommand {
    input: unknown

    constructor(input: unknown) {
      this.input = input
    }
  }

  class UpdateCommand {
    input: unknown

    constructor(input: unknown) {
      this.input = input
    }
  }

  return {
    DeleteCommand,
    DynamoDBClient,
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    ScanCommand,
    UpdateCommand,
    fromMock,
    sendMock,
  }
})

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: awsMocks.DynamoDBClient,
}))

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DeleteCommand: awsMocks.DeleteCommand,
  DynamoDBDocumentClient: awsMocks.DynamoDBDocumentClient,
  GetCommand: awsMocks.GetCommand,
  PutCommand: awsMocks.PutCommand,
  ScanCommand: awsMocks.ScanCommand,
  UpdateCommand: awsMocks.UpdateCommand,
}))

async function loadSubject() {
  vi.resetModules()

  return await import("@/features/orders/repositories/dynamo-db-order-repository")
}

function setEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

const baseValues = {
  customerName: "山田 太郎",
  customerEmail: "yamada@example.com",
  shippingAddress: "東京都千代田区1-1-1",
  paymentMethod: "bank-transfer" as const,
  note: "至急",
  items: [
    {
      productName: "商品A",
      quantity: 2,
      unitPrice: 1200,
    },
    {
      productName: "商品B",
      quantity: 1,
      unitPrice: 1300,
    },
  ],
}

const sampleOrderItem = {
  orderId: "ORD-20260827-000001",
  orderedAt: "2026-08-27T00:00:00.000Z",
  customerName: "山田 太郎",
  customerEmail: "yamada@example.com",
  shippingAddress: "東京都千代田区1-1-1",
  paymentMethod: "credit-card" as const,
  status: "pending" as const,
  items: [
    {
      productName: "商品A",
      quantity: 2,
      unitPrice: 1200,
    },
  ],
  totalAmount: 2400,
}

describe("dynamoDbOrderRepository", () => {
  beforeEach(() => {
    awsMocks.sendMock.mockReset()
    awsMocks.fromMock.mockClear()
    setEnv({
      AWS_REGION: "ap-northeast-1",
      ORDERS_TABLE_NAME: "oms-dev-orders",
    })
  })

  afterEach(() => {
    awsMocks.sendMock.mockReset()
    awsMocks.fromMock.mockClear()
    vi.useRealTimers()
    setEnv({
      AWS_REGION: undefined,
      ORDERS_TABLE_NAME: undefined,
    })
  })

  // テーブル名がないときは、DynamoDB 実装としては安全に失敗することを確認する。
  it("throws when the orders table name is missing", async () => {
    setEnv({
      ORDERS_TABLE_NAME: undefined,
    })

    const { dynamoDbOrderRepository } = await loadSubject()

    // 必須環境変数がないときは保存処理に進まないことを確認する。
    await expect(dynamoDbOrderRepository.create(baseValues)).rejects.toThrow(
      "ORDERS_TABLE_NAME is required for the DynamoDB order repository"
    )
  })

  // 作成時に金額計算と item 保存が正しく行われることを確認する。
  it("creates an order with a calculated total amount", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-27T12:34:56.789Z"))
    awsMocks.sendMock.mockResolvedValueOnce({})

    const { dynamoDbOrderRepository } = await loadSubject()

    const order = await dynamoDbOrderRepository.create(baseValues)

    // 採番された注文が期待どおりの形で返ることを確認する。
    expect(order).toMatchObject({
      customerName: "山田 太郎",
      customerEmail: "yamada@example.com",
      shippingAddress: "東京都千代田区1-1-1",
      paymentMethod: "bank-transfer",
      status: "pending",
      totalAmount: 3700,
    })
    expect(order.id).toMatch(/^ORD-20260827-[0-9a-f]{8}$/)
    expect(order.orderedAt).toBe("2026-08-27T12:34:56.789Z")

    const command = awsMocks.sendMock.mock.calls[0]?.[0] as {
      input?: { Item?: Record<string, unknown>; TableName?: string }
    }
    // 保存先テーブルと orderId 付き item が書き込まれることを確認する。
    expect(command.input).toMatchObject({
      TableName: "oms-dev-orders",
      Item: expect.objectContaining({
        orderId: order.id,
        totalAmount: 3700,
      }),
    })
  })

  // 取得時に壊れた item が来ても、安全な既定値に落ちることを確認する。
  it("normalizes raw orders when reading by id", async () => {
    awsMocks.sendMock.mockResolvedValueOnce({
      Item: {
        id: "ORD-20260827-000001",
        orderedAt: "2026-08-27T00:00:00.000Z",
        customerName: "山田 太郎",
        customerEmail: "yamada@example.com",
        shippingAddress: "東京都千代田区1-1-1",
        paymentMethod: "invalid-method",
        status: "invalid-status",
        items: "not-an-array",
        totalAmount: 2400,
      },
    })

    const { dynamoDbOrderRepository } = await loadSubject()

    await expect(dynamoDbOrderRepository.getById("ORD-20260827-000001")).resolves.toEqual(
      expect.objectContaining({
        id: "ORD-20260827-000001",
        paymentMethod: "credit-card",
        status: "pending",
        items: [],
      })
    )
  })

  // 取得結果が空なら undefined を返すことを確認する。
  it("returns undefined when the order is missing by id", async () => {
    awsMocks.sendMock.mockResolvedValueOnce({ Item: undefined })

    const { dynamoDbOrderRepository } = await loadSubject()

    await expect(dynamoDbOrderRepository.getById("ORD-NOT-FOUND")).resolves.toBeUndefined()
  })

  // 一覧取得は検索条件に応じて絞り込み、並び順も新しい順になることを確認する。
  it("lists and filters orders in descending order", async () => {
    awsMocks.sendMock.mockResolvedValueOnce({
      Items: [
        {
          ...sampleOrderItem,
          orderId: "ORD-OLD",
          orderedAt: "2026-08-26T00:00:00.000Z",
          customerName: "古い注文",
        },
        {
          ...sampleOrderItem,
          orderId: "ORD-NEW",
          orderedAt: "2026-08-27T00:00:00.000Z",
          customerName: "新しい注文",
          customerEmail: "new@example.com",
          shippingAddress: "東京都渋谷区1-2-3",
          paymentMethod: "bank-transfer",
          status: "processing",
          items: [
            {
              productName: "渋谷商品",
              quantity: 1,
              unitPrice: 500,
            },
          ],
        },
        {
          status: "processing",
        },
      ],
    })

    awsMocks.sendMock.mockResolvedValueOnce({
      Items: [
        {
          ...sampleOrderItem,
          orderId: "ORD-MATCH",
          orderedAt: "2026-08-28T00:00:00.000Z",
          customerName: "渋谷注文",
          shippingAddress: "東京都渋谷区1-2-3",
          paymentMethod: "bank-transfer",
          status: "processing",
          items: [
            {
              productName: "渋谷商品",
              quantity: 1,
              unitPrice: 500,
            },
          ],
        },
        {
          ...sampleOrderItem,
          orderId: "ORD-NOPE",
          orderedAt: "2026-08-29T00:00:00.000Z",
          customerName: "対象外",
          shippingAddress: "大阪府大阪市1-2-3",
          paymentMethod: "credit-card",
          status: "pending",
          items: [
            {
              productName: "大阪商品",
              quantity: 1,
              unitPrice: 500,
            },
          ],
        },
      ],
    })

    const { dynamoDbOrderRepository } = await loadSubject()

    // 条件なし一覧は新しい順に並ぶことを確認する。
    await expect(dynamoDbOrderRepository.list()).resolves.toEqual([
      expect.objectContaining({ id: "ORD-NEW" }),
      expect.objectContaining({ id: "ORD-OLD" }),
    ])

    // query / status / paymentMethod を入れると対象だけ残ることを確認する。
    await expect(
      dynamoDbOrderRepository.list({
        query: "渋谷",
        status: "processing",
        paymentMethod: "bank-transfer",
      })
    ).resolves.toEqual([
      expect.objectContaining({ id: "ORD-MATCH" }),
    ])
  })

  // 存在する注文は削除でき、先に存在確認が走ることを確認する。
  it("deletes an existing order", async () => {
    awsMocks.sendMock
      .mockResolvedValueOnce({
        Item: sampleOrderItem,
      })
      .mockResolvedValueOnce({})

    const { dynamoDbOrderRepository } = await loadSubject()

    await expect(dynamoDbOrderRepository.delete("ORD-20260827-000001")).resolves.toBe(
      true
    )
    // getById と DeleteCommand の 2 回送信になることを確認する。
    expect(awsMocks.sendMock).toHaveBeenCalledTimes(2)
  })

  // 存在しない注文の削除は何もせず false で返すことを確認する。
  it("returns false when deleting a missing order", async () => {
    awsMocks.sendMock.mockResolvedValueOnce({ Item: undefined })

    const { dynamoDbOrderRepository } = await loadSubject()

    await expect(dynamoDbOrderRepository.delete("ORD-NOT-FOUND")).resolves.toBe(false)
  })

  // 更新は成功時に新しい item を返すことを確認する。
  it("updates an order and returns the updated item", async () => {
    awsMocks.sendMock.mockResolvedValueOnce({
      Attributes: {
        ...sampleOrderItem,
        customerName: "更新後",
        totalAmount: 9999,
      },
    })

    const { dynamoDbOrderRepository } = await loadSubject()

    await expect(
      dynamoDbOrderRepository.update("ORD-20260827-000001", baseValues)
    ).resolves.toEqual(
      expect.objectContaining({
        customerName: "更新後",
        totalAmount: 9999,
      })
    )
  })

  // 条件付き更新の失敗は undefined に変換することを確認する。
  it("returns undefined when update hits a conditional check failure", async () => {
    awsMocks.sendMock.mockRejectedValueOnce({
      name: "ConditionalCheckFailedException",
    })

    const { dynamoDbOrderRepository } = await loadSubject()

    await expect(
      dynamoDbOrderRepository.update("ORD-20260827-000001", baseValues)
    ).resolves.toBeUndefined()
  })

  // 予期しない更新エラーは、そのまま上位に投げ直すことを確認する。
  it("rethrows unexpected update errors", async () => {
    awsMocks.sendMock.mockRejectedValueOnce(new Error("boom"))

    const { dynamoDbOrderRepository } = await loadSubject()

    await expect(
      dynamoDbOrderRepository.update("ORD-20260827-000001", baseValues)
    ).rejects.toThrow("boom")
  })

  // ステータス更新は成功時に更新済み item を返すことを確認する。
  it("updates order status and returns the updated item", async () => {
    awsMocks.sendMock.mockResolvedValueOnce({
      Attributes: {
        ...sampleOrderItem,
        status: "shipped",
      },
    })

    const { dynamoDbOrderRepository } = await loadSubject()

    await expect(
      dynamoDbOrderRepository.updateStatus("ORD-20260827-000001", "shipped")
    ).resolves.toEqual(
      expect.objectContaining({
        status: "shipped",
      })
    )
  })

  // ステータス更新でも条件付き失敗は undefined に変換することを確認する。
  it("returns undefined when updateStatus hits a conditional check failure", async () => {
    awsMocks.sendMock.mockRejectedValueOnce({
      name: "ConditionalCheckFailedException",
    })

    const { dynamoDbOrderRepository } = await loadSubject()

    await expect(
      dynamoDbOrderRepository.updateStatus("ORD-20260827-000001", "shipped")
    ).resolves.toBeUndefined()
  })
})
