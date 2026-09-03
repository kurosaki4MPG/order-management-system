import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/features/orders/services/order-service", () => ({
  getOrderById: vi.fn().mockResolvedValue(undefined),
  getOrders: vi.fn().mockResolvedValue([]),
}))

import {
  buildInvoiceDocumentFromOrder,
  buildInvoiceDocumentFromPreviewOrder,
  resolveInvoiceOrder,
} from "@/features/pdf/invoice-order.server"
import type { Order } from "@/features/orders/types/order"
import { getOrderById, getOrders } from "@/features/orders/services/order-service"

// 注文データから請求書ドキュメントを組み立てるロジックが、帳票要件どおりに動くことを確認する。
const sampleOrder: Order = {
  id: "ORD-20260826-ABC12345",
  orderedAt: "2026-08-26T14:00:00.000Z",
  customerName: "テスト顧客",
  customerEmail: "test@example.com",
  shippingAddress: "東京都港区1-2-3",
  status: "pending",
  paymentMethod: "credit-card",
  items: [
    {
      productName: "商品A",
      quantity: 2,
      unitPrice: 1200,
    },
    {
      productName: "商品B",
      quantity: 1,
      unitPrice: 3500,
    },
  ],
  totalAmount: 5900,
}

// 乱れたテスト時刻が次のテストに影響しないよう、各ケース後に必ず元へ戻す。
afterEach(() => {
  vi.useRealTimers()
})

// 請求書番号、日付、明細、備考が注文内容から正しく生成されることを確認する。
describe("buildInvoiceDocumentFromOrder", () => {
  // 指定日時を与えた場合に、請求書本文が安定して生成されることを確認する。
  it("builds an invoice document from an order", () => {
    const invoice = buildInvoiceDocumentFromOrder(
      sampleOrder,
      "2026-08-27T12:34:56.000Z"
    )

    // 注文データから請求書の各項目が組み立てられることを確認する。
    expect(invoice).toEqual({
      invoiceNumber: "INV-20260827-ABC12345",
      orderId: "ORD-20260826-ABC12345",
      customerName: "テスト顧客",
      customerAddress: "東京都港区1-2-3",
      issuedAt: "2026-08-27 12:34",
      dueAt: "2026-09-26",
      paymentTerms: "月末締め翌月末払い",
      lineItems: [
        {
          description: "商品A",
          quantity: 2,
          unitPrice: 1200,
        },
        {
          description: "商品B",
          quantity: 1,
          unitPrice: 3500,
        },
      ],
      notes: [
        "注文管理システムの注文データから自動生成した請求書です。",
        "注文ID: ORD-20260826-ABC12345",
        "顧客名: テスト顧客",
        "支払い方法: credit-card",
        "注文日時: 2026-08-26T14:00:00.000Z",
      ],
    })
  })

  // issuedAt を省略したときは、現在時刻を使って生成できることを確認する。
  it("uses the current time when issuedAt is omitted", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-27T01:00:00.000Z"))

    const invoice = buildInvoiceDocumentFromOrder(sampleOrder)

    // issuedAt 省略時に現在時刻が使われることを確認する。
    expect(invoice.issuedAt).toBe("2026-08-27 01:00")
    // 請求書番号が注文 ID から安定生成されることを確認する。
    expect(invoice.invoiceNumber).toBe("INV-20260827-ABC12345")
  })

  // 注文 ID に英数字がない場合は、請求書番号の末尾を ORDER に寄せることを確認する。
  it("falls back to ORDER when the order id has no alphanumeric characters", () => {
    const invoice = buildInvoiceDocumentFromOrder(
      {
        ...sampleOrder,
        id: "!!!",
      },
      "2026-08-27T12:34:56.000Z"
    )

    // 英数字が取れない場合でも請求書番号が壊れないことを確認する。
    expect(invoice.invoiceNumber).toBe("INV-20260827-ORDER")
  })
})

describe("buildInvoiceDocumentFromPreviewOrder", () => {
  // プレビュー用のシード値から、安定した issuedAt を組み立てられることを確認する。
  it("builds a preview invoice document from a deterministic seed", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-27T00:00:00.000Z"))

    const invoice = buildInvoiceDocumentFromPreviewOrder(sampleOrder, 3600)

    // previewSeed を元に issuedAt が 1 時間進んだ値になることを確認する。
    expect(invoice.issuedAt).toBe("2026-08-27 01:00")
    // 既存の請求書組み立てロジックがそのまま使われることを確認する。
    expect(invoice.invoiceNumber).toBe("INV-20260827-ABC12345")
  })
})

describe("resolveInvoiceOrder", () => {
  // 注文が見つからない場合に null を返すことを確認する。
  it("returns null when the order does not exist", async () => {
    expect(await resolveInvoiceOrder("ORD-NOT-FOUND")).toBeNull()
  })

  // orderId が未指定なら一覧の先頭を使うことを確認する。
  it("returns the first order when no order id is provided", async () => {
    vi.mocked(getOrders).mockResolvedValueOnce([sampleOrder])

    await expect(resolveInvoiceOrder()).resolves.toEqual(sampleOrder)
  })

  // orderId がある場合は 1 件取得を優先することを確認する。
  it("returns the matching order when order id is provided", async () => {
    vi.mocked(getOrderById).mockResolvedValueOnce(sampleOrder)

    await expect(resolveInvoiceOrder("ORD-20260826-ABC12345")).resolves.toEqual(sampleOrder)
  })
})
