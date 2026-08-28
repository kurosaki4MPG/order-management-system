import { z } from "zod"

import { buildInvoiceDocumentFromOrder, resolveInvoiceOrder } from "@/features/pdf/invoice-order.server"
import { renderInvoicePdf } from "@/features/pdf/invoice-pdf.server"
import { saveInvoicePdfToS3 } from "@/features/pdf/invoice-artifacts.server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const invoiceQuerySchema = z.object({
  orderId: z.string().min(1).optional(),
  preview: z.coerce.number().int().nonnegative().optional(),
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = Object.fromEntries(url.searchParams.entries())
  const result = invoiceQuerySchema.safeParse(query)

  if (!result.success) {
    return Response.json(
      {
        error: "Invalid invoice query",
        issues: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const order = await resolveInvoiceOrder(result.data.orderId)

  if (!order) {
    return Response.json(
      {
        error: "Order not found",
      },
      { status: 404 }
    )
  }

  const invoice = buildInvoiceDocumentFromOrder(order)
  const pdf = await renderInvoicePdf(invoice)
  const saved = await saveInvoicePdfToS3(invoice, pdf)

  if (!saved.enabled) {
    return Response.json(
      {
        error: "PDF invoice S3 storage is not configured",
      },
      { status: 503 }
    )
  }

  return Response.json({
    bucket: saved.bucket,
    issuedAt: saved.issuedAt,
    invoiceNumber: invoice.invoiceNumber,
    key: saved.key,
    orderId: invoice.orderId,
    savedAt: saved.savedAt,
  })
}
