import type { InvoiceDocumentProps } from "@/features/pdf/invoice-document"

export const sampleInvoice: InvoiceDocumentProps = {
  orderId: "ORD-TEST-001",
  invoiceNumber: "INV-20260826-001",
  customerName: "株式会社オーダー管理システムソリューションズ",
  customerAddress:
    "東京都千代田区丸の内1-1-1 サンプルビル 8F\n請求管理部 宛",
  issuedAt: "2026-08-26 14:00",
  dueAt: "2026-09-30",
  paymentTerms: "月末締め翌月末払い",
  lineItems: [
    {
      description: "注文管理システム 初期導入",
      quantity: 1,
      unitPrice: 120000,
    },
    {
      description: "非同期処理ワークフロー設定",
      quantity: 2,
      unitPrice: 45000,
    },
    {
      description: "監視アラーム設定",
      quantity: 1,
      unitPrice: 30000,
    },
  ],
  notes: [
    "本帳票は STEP40 のテンプレート確認用です。",
    "実運用では請求先情報と明細を API から注入します。",
    "金額はサンプル値であり、サーバー側計算へ置き換える前提です。",
    "全角記号（「」・（）・〜）、かな、漢字、英数字が混在しても崩れないことを確認します。",
  ],
}
