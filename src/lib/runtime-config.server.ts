// サーバー側で参照する設定値を一か所に寄せる。
// ここで扱うのは、秘密そのものではなくデプロイ先ごとの実行設定。
// 本当に秘匿すべき値は Secrets Manager か GitHub Secrets に置く。

function requireEnv(name: string, purpose: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is required for ${purpose}`)
  }

  return value
}

export function getAwsRegion() {
  return (
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    "ap-northeast-1"
  )
}

export function getOrdersTableName() {
  return requireEnv("ORDERS_TABLE_NAME", "the DynamoDB order repository")
}

export function getOrderEventsBusName() {
  return requireEnv("ORDER_EVENTS_BUS_NAME", "the EventBridge order publisher")
}

export function getOrderNotificationsTopicArn() {
  return requireEnv(
    "ORDER_NOTIFICATIONS_TOPIC_ARN",
    "the notification Lambda"
  )
}

export function getPdfInvoiceBucketName() {
  return process.env.PDF_INVOICE_BUCKET_NAME?.trim() || null
}

export function getPdfInvoiceRegion() {
  return (
    process.env.PDF_INVOICE_AWS_REGION?.trim() || getAwsRegion()
  )
}
