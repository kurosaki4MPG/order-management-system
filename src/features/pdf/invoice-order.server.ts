import type { Order } from "@/features/orders/types/order"
import { extractOrderIdSuffix } from "@/features/orders/utils/order-id"
import { getOrderById, getOrders } from "@/features/orders/services/order-service"

import type {
  InvoiceDocumentProps,
  InvoiceLineItem,
} from "@/features/pdf/invoice-document"

function formatInvoiceDate(value: Date) {
  return value.toISOString().slice(0, 16).replace("T", " ")
}

function formatInvoiceDay(value: Date) {
  return value.toISOString().slice(0, 10)
}

function addDays(value: Date, days: number) {
  const nextDate = new Date(value)
  nextDate.setDate(nextDate.getDate() + days)

  return nextDate
}

function buildInvoiceNumber(orderId: string, issuedAt: Date) {
  const datePart = issuedAt.toISOString().slice(0, 10).replaceAll("-", "")
  const orderPart = extractOrderIdSuffix(orderId)

  return `INV-${datePart}-${orderPart || "ORDER"}`
}

function buildNotes(order: Order) {
  return [
    "注文管理システムの注文データから自動生成した請求書です。",
    `注文ID: ${order.id}`,
    `顧客名: ${order.customerName}`,
    `支払い方法: ${order.paymentMethod}`,
    `注文日時: ${order.orderedAt}`,
  ]
}

function buildLineItems(order: Order): InvoiceLineItem[] {
  return order.items.map((item) => ({
    description: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }))
}

export function buildInvoiceDocumentFromOrder(
  order: Order,
  issuedAtInput?: string
): InvoiceDocumentProps {
  const issuedAtDate = issuedAtInput
    ? new Date(issuedAtInput)
    : new Date()
  const dueAtDate = addDays(issuedAtDate, 30)
  const invoiceNumber = buildInvoiceNumber(order.id, issuedAtDate)

  return {
    orderId: order.id,
    invoiceNumber,
    customerName: order.customerName,
    customerAddress: order.shippingAddress,
    issuedAt: formatInvoiceDate(issuedAtDate),
    dueAt: formatInvoiceDay(dueAtDate),
    paymentTerms: "月末締め翌月末払い",
    lineItems: buildLineItems(order),
    notes: buildNotes(order),
  }
}

export function buildInvoiceDocumentFromPreviewOrder(
  order: Order,
  previewSeed: number
) {
  const issuedAt = new Date(Date.now() + previewSeed * 1000)

  return buildInvoiceDocumentFromOrder(order, issuedAt.toISOString())
}

export async function resolveInvoiceOrder(orderId?: string) {
  if (orderId) {
    return (await getOrderById(orderId)) ?? null
  }

  const orders = await getOrders()

  return orders[0] ?? null
}
