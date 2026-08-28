import {
  createInvoiceSignedUrlFromSavedObject,
  saveInvoicePdfToS3,
} from "@/features/pdf/invoice-artifacts.server"
import { buildInvoiceDocumentFromOrder } from "@/features/pdf/invoice-order.server"
import { renderInvoicePdf } from "@/features/pdf/invoice-pdf.server"
import { getOrderById } from "@/features/orders/services/order-service"

type WorkflowInvoiceEvent = {
  completedAt?: string;
  customerEmail?: string;
  customerName?: string;
  detailType?: string;
  eventId?: string;
  orderId?: string;
  paymentMethod?: string;
  prepareCompletedAt?: string;
  shippingAddress?: string;
  shouldFail?: boolean | string;
  status?: string;
  step?: string;
  totalAmount?: number;
  workflow?: string;
  source?: string;
}

type RequiredWorkflowInvoiceInput = WorkflowInvoiceEvent & {
  customerName: string;
  eventId: string;
  orderId: string;
  shippingAddress: string;
  workflow: string;
}

type WorkflowInvoiceResult = WorkflowInvoiceEvent & {
  invoiceBucket: string;
  invoiceExpiresInSeconds: number;
  invoiceIssuedAt: string;
  invoiceKey: string;
  invoiceNumber: string;
  invoiceSignedUrl: string;
}

function assertWorkflowInvoiceInput(event: WorkflowInvoiceEvent) {
  if (
    !event.workflow ||
    !event.orderId ||
    !event.eventId ||
    !event.customerName ||
    !event.shippingAddress
  ) {
    throw new Error(
      "workflow, orderId, eventId, customerName, and shippingAddress are required"
    )
  }

  return event as RequiredWorkflowInvoiceInput
}

export async function handler(
  event: WorkflowInvoiceEvent
): Promise<WorkflowInvoiceResult> {
  const input = assertWorkflowInvoiceInput(event)
  const completedAt = input.completedAt ?? new Date().toISOString()

  const order = await getOrderById(input.orderId)

  if (!order) {
    throw new Error(`Order not found: ${input.orderId}`)
  }

  const invoice = buildInvoiceDocumentFromOrder(order, completedAt)

  const pdf = await renderInvoicePdf(invoice)
  const saved = await saveInvoicePdfToS3(invoice, pdf)

  if (!saved.enabled) {
    throw new Error("PDF invoice S3 storage is not configured")
  }

  const signedUrl = await createInvoiceSignedUrlFromSavedObject(saved)

  console.log("Invoice generated for workflow", {
    invoiceBucket: signedUrl.bucket,
    invoiceKey: signedUrl.key,
    invoiceNumber: invoice.invoiceNumber,
    orderId: input.orderId,
    workflow: input.workflow,
  })

  return {
    ...input,
    invoiceBucket: signedUrl.bucket,
    invoiceExpiresInSeconds: signedUrl.expiresInSeconds,
    invoiceIssuedAt: invoice.issuedAt,
    invoiceKey: signedUrl.key,
    invoiceNumber: invoice.invoiceNumber,
    invoiceSignedUrl: signedUrl.signedUrl,
  }
}
