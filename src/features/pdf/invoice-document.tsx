import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

export type InvoiceLineItem = {
  description: string
  quantity: number
  unitPrice: number
}

export type InvoiceDocumentProps = {
  orderId: string
  invoiceNumber: string
  customerName: string
  customerAddress: string
  issuedAt: string
  dueAt: string
  paymentTerms: string
  lineItems: readonly InvoiceLineItem[]
  notes: readonly string[]
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#f8f4ec",
    color: "#1f2937",
    fontFamily: "InvoiceJP",
    fontSize: 10.5,
    padding: 28,
  },
  header: {
    borderBottomColor: "#c7b8a3",
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
    marginBottom: 14,
    paddingBottom: 12,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    color: "#7c2d12",
    fontSize: 23,
    fontWeight: 700,
    letterSpacing: 1.2,
  },
  subtitle: {
    color: "#6b7280",
    fontFamily: "InvoiceJP",
    fontSize: 10,
    marginTop: 2,
  },
  badge: {
    backgroundColor: "#7c2d12",
    color: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  topMetaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topMetaCard: {
    backgroundColor: "#fffaf4",
    borderColor: "#e5d7c7",
    borderStyle: "solid",
    borderWidth: 1,
    padding: 10,
    width: "32%",
  },
  metaLabel: {
    color: "#9a3412",
    fontFamily: "InvoiceJP",
    fontSize: 9,
    marginBottom: 4,
  },
  metaValue: {
    fontFamily: "InvoiceJP",
    fontSize: 11,
    fontWeight: 700,
  },
  metaValueMono: {
    fontFamily: "Helvetica",
    fontSize: 11,
    fontWeight: 700,
  },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  infoCard: {
    backgroundColor: "#fffaf4",
    borderColor: "#e5d7c7",
    borderStyle: "solid",
    borderWidth: 1,
    padding: 12,
    width: "49%",
  },
  infoCardTitle: {
    color: "#7c2d12",
    fontFamily: "InvoiceJP",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  issuerTitle: {
    color: "#7c2d12",
    fontFamily: "InvoiceJP",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
  issuerText: {
    color: "#4b5563",
    fontFamily: "InvoiceJP",
    fontSize: 9.5,
    lineHeight: 1.4,
    marginBottom: 2,
  },
  customerName: {
    fontFamily: "InvoiceJP",
    fontSize: 14,
    fontWeight: 400,
    marginBottom: 6,
  },
  customerAddress: {
    color: "#4b5563",
    fontFamily: "InvoiceJP",
    fontSize: 9.5,
    lineHeight: 1.5,
  },
  sectionTitle: {
    color: "#7c2d12",
    fontFamily: "InvoiceJP",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
    marginTop: 2,
  },
  table: {
    borderColor: "#d6c5b2",
    borderStyle: "solid",
    borderWidth: 1,
  },
  tableRow: {
    borderBottomColor: "#e5d7c7",
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: "#f2e6d8",
  },
  cell: {
    padding: 8,
  },
  descriptionCell: {
    width: "46%",
  },
  quantityCell: {
    textAlign: "right",
    width: "12%",
  },
  unitPriceCell: {
    textAlign: "right",
    width: "21%",
  },
  amountCell: {
    textAlign: "right",
    width: "21%",
  },
  lineItemDescription: {
    fontFamily: "InvoiceJP",
    fontSize: 10.5,
    lineHeight: 1.35,
  },
  lineItemLabel: {
    color: "#6b7280",
    fontFamily: "InvoiceJP",
    fontSize: 8,
    marginBottom: 2,
  },
  lineItemValue: {
    fontSize: 10.5,
  },
  detailAndSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  noteCard: {
    backgroundColor: "#fffaf4",
    borderColor: "#d6c5b2",
    borderStyle: "solid",
    borderWidth: 1,
    padding: 12,
    width: "58%",
  },
  noteItem: {
    flexDirection: "row",
    marginBottom: 6,
  },
  noteBullet: {
    color: "#9a3412",
    fontFamily: "InvoiceJP",
    fontSize: 10,
    marginRight: 6,
    marginTop: 0.5,
  },
  noteText: {
    color: "#374151",
    fontFamily: "InvoiceJP",
    fontSize: 9.5,
    flexGrow: 1,
    lineHeight: 1.45,
  },
  summary: {
    backgroundColor: "#fffaf4",
    borderColor: "#d6c5b2",
    borderStyle: "solid",
    borderWidth: 1,
    padding: 12,
    width: "38%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryTotal: {
    borderTopColor: "#c7b8a3",
    borderTopStyle: "solid",
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 8,
  },
  summaryLabel: {
    color: "#374151",
    fontFamily: "InvoiceJP",
    fontSize: 10,
  },
  summaryValue: {
    fontFamily: "InvoiceJP",
    fontSize: 10,
    fontWeight: 700,
  },
  summaryTotalLabel: {
    color: "#7c2d12",
    fontFamily: "InvoiceJP",
    fontSize: 11,
    fontWeight: 700,
  },
  summaryTotalValue: {
    color: "#7c2d12",
    fontFamily: "InvoiceJP",
    fontSize: 11,
    fontWeight: 700,
  },
  summarySmall: {
    color: "#6b7280",
    fontFamily: "InvoiceJP",
    fontSize: 8.5,
    lineHeight: 1.4,
    marginTop: 8,
  },
  footerDivider: {
    borderTopColor: "#d6c5b2",
    borderTopStyle: "solid",
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 10,
  },
  footerText: {
    color: "#6b7280",
    fontFamily: "InvoiceJP",
    fontSize: 8.5,
    lineHeight: 1.4,
  },
})

function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    currency: "JPY",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function formatDate(value: string) {
  return value
}

export function InvoiceDocument({
  orderId,
  invoiceNumber,
  customerName,
  customerAddress,
  issuedAt,
  dueAt,
  paymentTerms,
  lineItems,
  notes,
}: InvoiceDocumentProps) {
  const subtotal = lineItems.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0
  )
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>ORDER INVOICE</Text>
              <Text style={styles.subtitle}>
                注文管理システムの請求書テンプレート
              </Text>
            </View>
            <View style={styles.badge}>
              <Text>ACCOUNTING COPY</Text>
            </View>
          </View>

          <View style={styles.topMetaGrid}>
            <View style={styles.topMetaCard}>
              <Text style={styles.metaLabel}>請求書番号</Text>
              <Text style={styles.metaValueMono}>{invoiceNumber}</Text>
            </View>
            <View style={styles.topMetaCard}>
              <Text style={styles.metaLabel}>注文ID</Text>
              <Text style={styles.metaValueMono}>{orderId}</Text>
            </View>
            <View style={styles.topMetaCard}>
              <Text style={styles.metaLabel}>発行日時</Text>
              <Text style={styles.metaValueMono}>{formatDate(issuedAt)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>請求先</Text>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.customerAddress}>{customerAddress}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>発行者</Text>
            <Text style={styles.issuerTitle}>Order Management System</Text>
            <Text style={styles.issuerText}>帳票出力サンプル</Text>
            <Text style={styles.issuerText}>
              Phase 5 STEP40 請求書テンプレート
            </Text>
            <Text style={styles.issuerText}>支払条件: {paymentTerms}</Text>
            <Text style={styles.issuerText}>支払期日: {formatDate(dueAt)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>明細</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cell, styles.descriptionCell]}>品目</Text>
            <Text style={[styles.cell, styles.quantityCell]}>数量</Text>
            <Text style={[styles.cell, styles.unitPriceCell]}>単価</Text>
            <Text style={[styles.cell, styles.amountCell]}>金額</Text>
          </View>

          {lineItems.map((item) => {
            const amount = item.quantity * item.unitPrice

            return (
              <View key={item.description} style={styles.tableRow}>
                <View style={[styles.cell, styles.descriptionCell]}>
                  <Text style={styles.lineItemLabel}>サービス内容</Text>
                  <Text style={styles.lineItemDescription}>
                    {item.description}
                  </Text>
                </View>
                <Text
                  style={[styles.cell, styles.quantityCell, styles.lineItemValue]}
                >
                  {item.quantity}
                </Text>
                <Text
                  style={[styles.cell, styles.unitPriceCell, styles.lineItemValue]}
                >
                  {formatYen(item.unitPrice)}
                </Text>
                <Text
                  style={[styles.cell, styles.amountCell, styles.lineItemValue]}
                >
                  {formatYen(amount)}
                </Text>
              </View>
            )
          })}
        </View>

        <View style={styles.detailAndSummary}>
          <View style={styles.noteCard}>
            <Text style={styles.sectionTitle}>備考</Text>
            {notes.map((note) => (
              <View key={note} style={styles.noteItem}>
                <Text style={styles.noteBullet}>・</Text>
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>小計</Text>
              <Text style={styles.summaryValue}>{formatYen(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>消費税 (10%)</Text>
              <Text style={styles.summaryValue}>{formatYen(tax)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>合計</Text>
              <Text style={styles.summaryTotalValue}>{formatYen(total)}</Text>
            </View>
            <Text style={styles.summarySmall}>
              この金額は注文内容から算出されたサンプル値です。
            </Text>
          </View>
        </View>

        <View style={styles.footerDivider}>
          <Text style={styles.footerText}>
            本テンプレートは Phase 5 STEP40 の確認用です。STEP42 以降で
            Lambda 生成や S3 保管へ接続できるよう、注文 ID・請求書番号・請求先・
            明細・備考をひとまとまりで表現しています。
          </Text>
        </View>
      </Page>
    </Document>
  )
}
