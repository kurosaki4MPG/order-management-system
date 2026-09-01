import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const awsMocks = vi.hoisted(() => {
  const send = vi.fn()
  const s3ClientInstances: Array<{ config: { region: string }; send: typeof send }> = []

  const S3Client = vi.fn().mockImplementation(function (
    this: unknown,
    config: { region: string }
  ) {
    const instance = { config, send }
    s3ClientInstances.push(instance)
    return instance
  })

  const PutObjectCommand = vi.fn().mockImplementation(function (
    this: unknown,
    input
  ) {
    return { input }
  })
  const GetObjectCommand = vi.fn().mockImplementation(function (
    this: unknown,
    input
  ) {
    return { input }
  })
  const getSignedUrl = vi.fn()

  return {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
    getSignedUrl,
    send,
    s3ClientInstances,
  }
})

vi.mock("@aws-sdk/client-s3", () => ({
  GetObjectCommand: awsMocks.GetObjectCommand,
  PutObjectCommand: awsMocks.PutObjectCommand,
  S3Client: awsMocks.S3Client,
}))

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: awsMocks.getSignedUrl,
}))

async function loadSubject() {
  vi.resetModules()

  return await import("@/features/pdf/invoice-artifacts.server")
}

function setEnv(env: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

beforeEach(() => {
  awsMocks.send.mockReset()
  awsMocks.s3ClientInstances.length = 0
  awsMocks.S3Client.mockClear()
  awsMocks.PutObjectCommand.mockClear()
  awsMocks.GetObjectCommand.mockClear()
  awsMocks.getSignedUrl.mockReset()
  setEnv({
    AWS_DEFAULT_REGION: undefined,
    AWS_REGION: undefined,
    PDF_INVOICE_AWS_REGION: undefined,
    PDF_INVOICE_BUCKET_NAME: undefined,
  })
})

afterEach(() => {
  setEnv({
    AWS_DEFAULT_REGION: undefined,
    AWS_REGION: undefined,
    PDF_INVOICE_AWS_REGION: undefined,
    PDF_INVOICE_BUCKET_NAME: undefined,
  })
})

// 請求書 PDF の保存キーと保存対象の抽出ロジックが、固定ルールどおりに動くことを確認する。
describe("buildInvoiceArtifactKey", () => {
  // orderId と invoiceNumber から S3 キーを一意に組み立てられることを確認する。
  it("builds a stable S3 key for invoice pdfs", async () => {
    const { buildInvoiceArtifactKey } = await loadSubject()

    // 保存先キーが規則どおりになることを確認する。
    expect(buildInvoiceArtifactKey("INV-20260827-ABC123", "ORD-TEST-001")).toBe(
      "orders/ORD-TEST-001/invoice-INV-20260827-ABC123.pdf"
    )
  })
})

// 請求書保存処理が、必要最小限の入力だけを取り出すことを確認する。
describe("buildInvoiceArtifactInput", () => {
  // 保存に必要な invoiceNumber と orderId だけを正しく取り出す。
  it("extracts the invoice number and order id only", async () => {
    const { buildInvoiceArtifactInput } = await loadSubject()

    // 保存に必要な最小限の値だけが抽出されることを確認する。
    expect(
      buildInvoiceArtifactInput({
        invoiceNumber: "INV-20260827-ABC123",
        orderId: "ORD-TEST-001",
      })
    ).toEqual({
      invoiceNumber: "INV-20260827-ABC123",
      orderId: "ORD-TEST-001",
    })
  })
})

describe("saveInvoicePdfToS3", () => {
  // バケット未設定時は保存処理を行わず、無効結果を返すことを確認する。
  it("returns disabled when the bucket is missing", async () => {
    const { saveInvoicePdfToS3 } = await loadSubject()

    const result = await saveInvoicePdfToS3(
      {
        invoiceNumber: "INV-20260827-ABC123",
        orderId: "ORD-TEST-001",
      },
      new Uint8Array([1, 2, 3])
    )

    expect(result).toMatchObject({
      enabled: false,
      reason: "missing_bucket",
    })
  })

  // デフォルトリージョンで S3 に保存され、保存メタデータが返ることを確認する。
  it("uploads the PDF using the default region", async () => {
    process.env.PDF_INVOICE_BUCKET_NAME = "invoice-bucket"

    const { saveInvoicePdfToS3 } = await loadSubject()

    const pdf = new Uint8Array([1, 2, 3])
    const result = await saveInvoicePdfToS3(
      {
        invoiceNumber: "INV-20260827-ABC123",
        orderId: "ORD-TEST-001",
      },
      pdf
    )

    // バケットが有効なときだけ保存処理に進むことを確認する。
    expect(result.enabled).toBe(true)
    if (!result.enabled) {
      throw new Error("expected saved invoice result to be enabled")
    }
    expect(result).toMatchObject({
      bucket: "invoice-bucket",
      key: "orders/ORD-TEST-001/invoice-INV-20260827-ABC123.pdf",
    })
    // issuedAt と savedAt は同じ瞬間の値として返ることを確認する。
    expect(result.issuedAt).toBe(result.savedAt)
    expect(result.issuedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    // S3 Client はデフォルトリージョンで作られることを確認する。
    expect(awsMocks.S3Client).toHaveBeenCalledWith({ region: "ap-northeast-1" })
    expect(awsMocks.send).toHaveBeenCalledTimes(1)

    const command = awsMocks.send.mock.calls[0]?.[0] as { input?: Record<string, unknown> }
    // PutObjectCommand に必要な保存先と保存オプションが渡ることを確認する。
    expect(command.input).toMatchObject({
      Bucket: "invoice-bucket",
      CacheControl: "no-store",
      ContentDisposition: 'inline; filename="INV-20260827-ABC123.pdf"',
      ContentType: "application/pdf",
      Key: "orders/ORD-TEST-001/invoice-INV-20260827-ABC123.pdf",
    })
    // PDF の本文がそのまま保存対象になることを確認する。
    expect(Buffer.isBuffer(command.input?.Body)).toBe(true)
    expect(Array.from(command.input?.Body as Buffer)).toEqual([1, 2, 3])
  })

  // 指定リージョンがある場合はそれが優先され、同じリージョンではクライアントを再利用することを確認する。
  it("prefers PDF_INVOICE_AWS_REGION and reuses the cached client", async () => {
    process.env.PDF_INVOICE_BUCKET_NAME = "invoice-bucket"
    process.env.PDF_INVOICE_AWS_REGION = "eu-west-1"
    process.env.AWS_REGION = "us-east-1"
    process.env.AWS_DEFAULT_REGION = "us-west-2"

    const { saveInvoicePdfToS3 } = await loadSubject()

    // 同じリージョンで 2 回保存して、クライアントが 1 回しか生成されないことを確認する。
    await saveInvoicePdfToS3(
      {
        invoiceNumber: "INV-20260827-ABC123",
        orderId: "ORD-TEST-001",
      },
      new Uint8Array([1])
    )
    await saveInvoicePdfToS3(
      {
        invoiceNumber: "INV-20260827-DEF456",
        orderId: "ORD-TEST-002",
      },
      new Uint8Array([2])
    )

    expect(awsMocks.S3Client).toHaveBeenCalledTimes(1)
    expect(awsMocks.S3Client).toHaveBeenCalledWith({ region: "eu-west-1" })
    expect(awsMocks.send).toHaveBeenCalledTimes(2)
  })

  // AWS_REGION は PDF_INVOICE_AWS_REGION が空のときに優先されることを確認する。
  it("falls back to AWS_REGION when PDF_INVOICE_AWS_REGION is blank", async () => {
    process.env.PDF_INVOICE_BUCKET_NAME = "invoice-bucket"
    process.env.PDF_INVOICE_AWS_REGION = "   "
    process.env.AWS_REGION = "us-east-1"
    process.env.AWS_DEFAULT_REGION = "us-west-2"

    const { saveInvoicePdfToS3 } = await loadSubject()

    await saveInvoicePdfToS3(
      {
        invoiceNumber: "INV-20260827-ABC123",
        orderId: "ORD-TEST-001",
      },
      new Uint8Array([1, 2, 3])
    )

    expect(awsMocks.S3Client).toHaveBeenCalledWith({ region: "us-east-1" })
  })
})

describe("createInvoiceSignedUrlFromSavedObject", () => {
  // 保存済みオブジェクトから署名付き URL を生成できることを確認する。
  it("creates a signed URL from a saved object", async () => {
    awsMocks.getSignedUrl.mockResolvedValue("https://example.com/signed-url")

    const { createInvoiceSignedUrlFromSavedObject } = await loadSubject()

    const saved = {
      bucket: "invoice-bucket",
      enabled: true as const,
      expiresInSeconds: 900,
      issuedAt: "2026-08-27T01:00:00.000Z",
      key: "orders/ORD-TEST-001/invoice-INV-20260827-ABC123.pdf",
      savedAt: "2026-08-27T01:00:00.000Z",
    }

    const result = await createInvoiceSignedUrlFromSavedObject(saved, 120)

    // GetObjectCommand に保存済みのバケットとキーが渡ることを確認する。
    expect(awsMocks.getSignedUrl).toHaveBeenCalledTimes(1)
    expect(awsMocks.GetObjectCommand).toHaveBeenCalledWith({
      Bucket: "invoice-bucket",
      Key: "orders/ORD-TEST-001/invoice-INV-20260827-ABC123.pdf",
    })
    // 署名付き URL の期限が引数どおりに反映されることを確認する。
    expect(awsMocks.getSignedUrl.mock.calls[0]?.[2]).toEqual({ expiresIn: 120 })
    expect(result).toEqual({
      bucket: "invoice-bucket",
      enabled: true,
      expiresInSeconds: 120,
      issuedAt: "2026-08-27T01:00:00.000Z",
      key: "orders/ORD-TEST-001/invoice-INV-20260827-ABC123.pdf",
      signedUrl: "https://example.com/signed-url",
    })
  })
})

describe("createInvoiceSignedUrl", () => {
  // バケット未設定時は署名付き URL の生成も無効になることを確認する。
  it("returns disabled when the bucket is missing", async () => {
    const { createInvoiceSignedUrl } = await loadSubject()

    await expect(
      createInvoiceSignedUrl(
        {
          invoiceNumber: "INV-20260827-ABC123",
          orderId: "ORD-TEST-001",
        },
        new Uint8Array([1, 2, 3])
      )
    ).resolves.toMatchObject({
      enabled: false,
      reason: "missing_bucket",
    })
  })

  // 保存から署名付き URL の生成までを一連で通せることを確認する。
  it("saves the PDF and returns a signed URL", async () => {
    process.env.PDF_INVOICE_BUCKET_NAME = "invoice-bucket"
    awsMocks.getSignedUrl.mockResolvedValue("https://example.com/signed-url")

    const { createInvoiceSignedUrl } = await loadSubject()

    const result = await createInvoiceSignedUrl(
      {
        invoiceNumber: "INV-20260827-ABC123",
        orderId: "ORD-TEST-001",
      },
      new Uint8Array([1, 2, 3]),
      600
    )

    // 保存したオブジェクトを元に署名付き URL が返ることを確認する。
    expect(result).toEqual({
      bucket: "invoice-bucket",
      enabled: true,
      expiresInSeconds: 600,
      issuedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      key: "orders/ORD-TEST-001/invoice-INV-20260827-ABC123.pdf",
      signedUrl: "https://example.com/signed-url",
    })
    expect(awsMocks.send).toHaveBeenCalledTimes(1)
    expect(awsMocks.getSignedUrl).toHaveBeenCalledTimes(1)
  })
})
