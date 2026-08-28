import { GetObjectCommand, S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import type { InvoiceDocumentProps } from "@/features/pdf/invoice-document"

type InvoiceArtifactInput = {
  invoiceNumber: string
  orderId: string
}

type SaveInvoicePdfResult =
  | {
      enabled: false
      reason: "missing_bucket"
    }
  | {
      bucket: string
      enabled: true
      key: string
      issuedAt: string
      savedAt: string
    }

type SignedInvoiceUrlResult =
  | {
      enabled: false
      reason: "missing_bucket"
    }
  | {
      bucket: string
      enabled: true
      expiresInSeconds: number
      issuedAt: string
      key: string
      signedUrl: string
    }

type SignedInvoiceUrlSuccess = Extract<SignedInvoiceUrlResult, { enabled: true }>

const DEFAULT_REGION = "ap-northeast-1"
const DEFAULT_EXPIRES_IN_SECONDS = 900
const s3ClientCache = new Map<string, S3Client>()

function getBucketName() {
  return process.env.PDF_INVOICE_BUCKET_NAME?.trim() || null
}

function getRegion() {
  return (
    process.env.PDF_INVOICE_AWS_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    DEFAULT_REGION
  )
}

function getS3Client() {
  const region = getRegion()
  const cachedClient = s3ClientCache.get(region)

  if (cachedClient) {
    return cachedClient
  }

  const client = new S3Client({ region })
  s3ClientCache.set(region, client)

  return client
}

export function buildInvoiceArtifactKey(invoiceNumber: string, orderId: string) {
  return `orders/${orderId}/invoice-${invoiceNumber}.pdf`
}

export function buildInvoiceArtifactInput(
  invoice: Pick<InvoiceDocumentProps, "invoiceNumber" | "orderId">
): InvoiceArtifactInput {
  return {
    invoiceNumber: invoice.invoiceNumber,
    orderId: invoice.orderId,
  }
}

export async function saveInvoicePdfToS3(
  invoice: Pick<InvoiceDocumentProps, "invoiceNumber" | "orderId">,
  pdf: Uint8Array
): Promise<SaveInvoicePdfResult> {
  const bucket = getBucketName()

  if (!bucket) {
    return {
      enabled: false,
      reason: "missing_bucket",
    }
  }

  const { invoiceNumber, orderId } = buildInvoiceArtifactInput(invoice)
  const key = buildInvoiceArtifactKey(invoiceNumber, orderId)
  const issuedAt = new Date().toISOString()

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Body: Buffer.from(pdf),
      CacheControl: "no-store",
      ContentDisposition: `inline; filename="${invoiceNumber}.pdf"`,
      ContentType: "application/pdf",
      Key: key,
    })
  )

  return {
    bucket,
    enabled: true,
    issuedAt,
    key,
    savedAt: issuedAt,
  }
}

export async function createInvoiceSignedUrlFromSavedObject(
  saved: Extract<SaveInvoicePdfResult, { enabled: true }>,
  expiresInSeconds = DEFAULT_EXPIRES_IN_SECONDS
): Promise<SignedInvoiceUrlSuccess> {
  const signedUrl = await getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: saved.bucket,
      Key: saved.key,
    }),
    {
      expiresIn: expiresInSeconds,
    }
  )

  return {
    bucket: saved.bucket,
    enabled: true,
    expiresInSeconds,
    issuedAt: saved.savedAt,
    key: saved.key,
    signedUrl,
  }
}

export async function createInvoiceSignedUrl(
  invoice: Pick<InvoiceDocumentProps, "invoiceNumber" | "orderId">,
  pdf: Uint8Array,
  expiresInSeconds = DEFAULT_EXPIRES_IN_SECONDS
): Promise<SignedInvoiceUrlResult> {
  const saved = await saveInvoicePdfToS3(invoice, pdf)

  if (!saved.enabled) {
    return {
      enabled: false,
      reason: saved.reason,
    }
  }

  return createInvoiceSignedUrlFromSavedObject(saved, expiresInSeconds)
}
