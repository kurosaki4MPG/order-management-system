import { randomUUID } from "node:crypto"

function normalizeOrderDatePart(orderedAt: string | Date) {
  const date =
    typeof orderedAt === "string" ? new Date(orderedAt) : orderedAt

  return date.toISOString().slice(0, 10).replaceAll("-", "")
}

export function buildOrderId(orderedAt: string | Date) {
  const datePart = normalizeOrderDatePart(orderedAt)
  const suffix = randomUUID().slice(0, 8)

  return `ORD-${datePart}-${suffix}`
}

export function extractOrderIdSuffix(orderId: string, fallback = "ORDER") {
  const segments = orderId.split("-").filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  const suffix = lastSegment?.replaceAll(/[^A-Za-z0-9]/g, "").slice(-8)

  return suffix || fallback
}
