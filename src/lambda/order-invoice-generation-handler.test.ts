import { beforeEach, describe, expect, it, vi } from "vitest"

const getOrderByIdMock = vi.hoisted(() => vi.fn())
const buildInvoiceDocumentFromOrderMock = vi.hoisted(() => vi.fn())
const renderInvoicePdfMock = vi.hoisted(() => vi.fn())
const saveInvoicePdfToS3Mock = vi.hoisted(() => vi.fn())
const createInvoiceSignedUrlFromSavedObjectMock = vi.hoisted(() => vi.fn())

vi.mock("@/features/orders/services/order-service", () => ({
  getOrderById: getOrderByIdMock,
}))

vi.mock("@/features/pdf/invoice-order.server", () => ({
  buildInvoiceDocumentFromOrder: buildInvoiceDocumentFromOrderMock,
}))

vi.mock("@/features/pdf/invoice-pdf.server", () => ({
  renderInvoicePdf: renderInvoicePdfMock,
}))

vi.mock("@/features/pdf/invoice-artifacts.server", () => ({
  createInvoiceSignedUrlFromSavedObject: createInvoiceSignedUrlFromSavedObjectMock,
  saveInvoicePdfToS3: saveInvoicePdfToS3Mock,
}))

import { handler } from "@/lambda/order-invoice-generation-handler"

describe("order-invoice-generation-handler", () => {
  beforeEach(() => {
    getOrderByIdMock.mockReset()
    buildInvoiceDocumentFromOrderMock.mockReset()
    renderInvoicePdfMock.mockReset()
    saveInvoicePdfToS3Mock.mockReset()
    createInvoiceSignedUrlFromSavedObjectMock.mockReset()
  })

  // invoice 専用の失敗フラグが、実際に Lambda のエラーを起こせることを確認する。
  it("throws a simulated failure when shouldFailInvoice is enabled", async () => {
    await expect(
      handler({
        customerName: "テスト顧客",
        detailType: "OrderCreated",
        eventId: "evt-001",
        orderId: "ORD-001",
        shouldFailInvoice: true,
        shippingAddress: "東京都千代田区1-1-1",
        workflow: "order-processing",
      })
    ).rejects.toThrow("Simulated invoice generation failure for order ORD-001")

    // 失敗フラグで落ちるため、注文取得までは進まないことを確認する。
    expect(getOrderByIdMock).not.toHaveBeenCalled()
  })

  // 正常系では注文取得後に PDF 保存と署名付き URL 生成まで進むことを確認する。
  it("returns a signed url when invoice generation succeeds", async () => {
    getOrderByIdMock.mockResolvedValue({
      customerEmail: "test@example.com",
      customerName: "テスト顧客",
      id: "ORD-001",
      items: [],
      orderedAt: "2026-08-27T00:00:00.000Z",
      paymentMethod: "credit-card",
      shippingAddress: "東京都千代田区1-1-1",
      status: "pending",
      totalAmount: 1000,
    })
    buildInvoiceDocumentFromOrderMock.mockReturnValue({
      invoiceNumber: "INV-20260827-001",
      orderId: "ORD-001",
      issuedAt: "2026-08-27 09:00",
    })
    renderInvoicePdfMock.mockResolvedValue(new Uint8Array([1, 2, 3]))
    saveInvoicePdfToS3Mock.mockResolvedValue({
      bucket: "bucket",
      enabled: true,
      issuedAt: "2026-08-27T00:00:00.000Z",
      key: "orders/ORD-001/invoice-INV-20260827-001.pdf",
      savedAt: "2026-08-27T00:00:00.000Z",
    })
    createInvoiceSignedUrlFromSavedObjectMock.mockResolvedValue({
      bucket: "bucket",
      enabled: true,
      expiresInSeconds: 900,
      issuedAt: "2026-08-27T00:00:00.000Z",
      key: "orders/ORD-001/invoice-INV-20260827-001.pdf",
      signedUrl: "https://example.com/invoice.pdf",
    })

    const result = await handler({
      customerName: "テスト顧客",
      detailType: "OrderCreated",
      eventId: "evt-002",
      orderId: "ORD-001",
      shippingAddress: "東京都千代田区1-1-1",
      workflow: "order-processing",
    })

    // 署名付き URL が返ることを確認する。
    expect(result.invoiceSignedUrl).toBe("https://example.com/invoice.pdf")
    // 注文 ID がそのまま引き継がれることを確認する。
    expect(result.orderId).toBe("ORD-001")
  })
})
