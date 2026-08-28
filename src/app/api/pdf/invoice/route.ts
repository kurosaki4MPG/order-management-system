import { z } from "zod"

import { buildInvoiceDocumentFromOrder } from "@/features/pdf/invoice-order.server"
import { resolveInvoiceOrder } from "@/features/pdf/invoice-order.server"
import { renderInvoicePdf } from "@/features/pdf/invoice-pdf.server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const invoiceQuerySchema = z.object({
  orderId: z.string().min(1).optional(),
  preview: z.coerce.number().int().nonnegative().optional(),
})

const pdfRenderVersion = 3
let cachedInvoiceKey: string | null = null
let cachedInvoicePdf: Uint8Array | null = null
let cachedInvoicePdfPromise: Promise<Uint8Array> | null = null

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
  const invoiceKey = JSON.stringify({
    invoice,
    orderId: order.id,
    pdfRenderVersion,
    preview: result.data.preview ?? 0,
  })

  if (cachedInvoiceKey === invoiceKey && cachedInvoicePdf) {
    return new Response(Buffer.from(cachedInvoicePdf), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
        "Content-Type": "application/pdf",
      },
    })
  }

  if (cachedInvoiceKey === invoiceKey && cachedInvoicePdfPromise) {
    const pdf = await cachedInvoicePdfPromise
    cachedInvoicePdf = pdf

    return new Response(Buffer.from(pdf), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
        "Content-Type": "application/pdf",
      },
    })
  }

  cachedInvoiceKey = invoiceKey
  cachedInvoicePdfPromise = renderInvoicePdf(invoice)
  const pdf = await cachedInvoicePdfPromise
  cachedInvoicePdf = pdf
  cachedInvoicePdfPromise = null

  return new Response(Buffer.from(pdf), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      "Content-Type": "application/pdf",
    },
  })
}
