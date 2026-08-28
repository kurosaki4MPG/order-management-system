import { Font } from "@react-pdf/renderer"

let serverFontsRegistered = false

export function registerInvoiceServerFonts() {
  if (serverFontsRegistered) {
    return
  }

  Font.register({
    family: "InvoiceJP",
    fonts: [
      {
        src: `${process.cwd()}/public/fonts/IPAPGothic-Regular.ttf`,
        fontWeight: 400,
      },
      {
        src: `${process.cwd()}/public/fonts/IPAPGothic-Bold.ttf`,
        fontWeight: 700,
      },
    ],
  })

  serverFontsRegistered = true
}
