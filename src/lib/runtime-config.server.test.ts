import { afterEach, describe, expect, it, vi } from "vitest"

import {
  getAwsRegion,
  getOrderEventsBusName,
  getOrderNotificationsTopicArn,
  getOrdersTableName,
  getPdfInvoiceBucketName,
  getPdfInvoiceRegion,
} from "@/lib/runtime-config.server"

function clearEnv() {
  delete process.env.AWS_REGION
  delete process.env.AWS_DEFAULT_REGION
  delete process.env.ORDERS_TABLE_NAME
  delete process.env.ORDER_EVENTS_BUS_NAME
  delete process.env.ORDER_NOTIFICATIONS_TOPIC_ARN
  delete process.env.PDF_INVOICE_AWS_REGION
  delete process.env.PDF_INVOICE_BUCKET_NAME
}

afterEach(() => {
  clearEnv()
  vi.unstubAllEnvs()
})

describe("runtime-config.server", () => {
  it("resolves the AWS region from the configured values", () => {
    process.env.AWS_REGION = "us-east-1"

    // 明示設定があるときはそれを最優先に使うことを確認する。
    expect(getAwsRegion()).toBe("us-east-1")

    delete process.env.AWS_REGION
    process.env.AWS_DEFAULT_REGION = "us-west-2"

    // AWS_REGION がなければ AWS_DEFAULT_REGION を使うことを確認する。
    expect(getAwsRegion()).toBe("us-west-2")

    delete process.env.AWS_DEFAULT_REGION

    // どちらもなければデフォルトリージョンに落ちることを確認する。
    expect(getAwsRegion()).toBe("ap-northeast-1")
  })

  it("returns non-secret deployment config values", () => {
    process.env.ORDERS_TABLE_NAME = "oms-dev-orders"
    process.env.ORDER_EVENTS_BUS_NAME = "oms-dev-order-events"
    process.env.ORDER_NOTIFICATIONS_TOPIC_ARN =
      "arn:aws:sns:ap-northeast-1:686910912663:oms-dev-order-notifications"
    process.env.PDF_INVOICE_BUCKET_NAME = "oms-dev-invoice-bucket"
    process.env.PDF_INVOICE_AWS_REGION = "eu-west-1"

    // それぞれの設定値が意図した用途で取得できることを確認する。
    expect(getOrdersTableName()).toBe("oms-dev-orders")
    expect(getOrderEventsBusName()).toBe("oms-dev-order-events")
    expect(getOrderNotificationsTopicArn()).toBe(
      "arn:aws:sns:ap-northeast-1:686910912663:oms-dev-order-notifications",
    )
    expect(getPdfInvoiceBucketName()).toBe("oms-dev-invoice-bucket")
    expect(getPdfInvoiceRegion()).toBe("eu-west-1")
  })

  it("throws when a required deployment config value is missing", () => {
    // 必須の設定値がないときに、明確なエラーで止まることを確認する。
    expect(() => getOrdersTableName()).toThrow(
      "ORDERS_TABLE_NAME is required for the DynamoDB order repository",
    )
  })
})
