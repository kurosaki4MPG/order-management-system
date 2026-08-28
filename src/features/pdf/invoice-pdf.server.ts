import { createElement } from "react"

import { renderToBuffer } from "@react-pdf/renderer"

import { InvoiceDocument } from "@/features/pdf/invoice-document"
import type { InvoiceDocumentProps } from "@/features/pdf/invoice-document"
import { registerInvoiceServerFonts } from "@/features/pdf/register-invoice-fonts.server"

export async function renderInvoicePdf(invoice: InvoiceDocumentProps) {
  registerInvoiceServerFonts()
  const document = createElement(InvoiceDocument, invoice) as never
  const buffer = await renderToBuffer(document)

  return new Uint8Array(buffer)
}
