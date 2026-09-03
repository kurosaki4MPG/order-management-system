import { describe, expect, it, vi } from "vitest"

const { randomUUIDMock } = vi.hoisted(() => ({
  randomUUIDMock: vi.fn(),
}))

vi.mock("node:crypto", () => ({
  default: {
    randomUUID: randomUUIDMock,
  },
  randomUUID: randomUUIDMock,
}))

import {
  buildOrderId,
  extractOrderIdSuffix,
} from "@/features/orders/utils/order-id"

describe("buildOrderId", () => {
  it("builds an order id from the date part and a UUID suffix", () => {
    randomUUIDMock.mockReturnValue("550e8400-e29b-41d4-a716-446655440000")

    // 日付部分と UUID 8 桁の末尾が組み合わさることを確認する。
    expect(buildOrderId("2026-08-27T12:34:56.000Z")).toBe(
      "ORD-20260827-550e8400"
    )
  })

  it("accepts a Date object as input", () => {
    randomUUIDMock.mockReturnValue("660e8400-e29b-41d4-a716-446655440000")

    // Date オブジェクトからでも同じ形式で採番できることを確認する。
    expect(buildOrderId(new Date("2026-08-25T00:00:00.000Z"))).toBe(
      "ORD-20260825-660e8400"
    )
  })

  it("extracts the trailing segment from legacy order ids", () => {
    // 旧形式の注文 ID では末尾の区切り値をそのまま請求書番号へ渡せることを確認する。
    expect(extractOrderIdSuffix("ORD-20260827-000001")).toBe("000001")
  })

  it("falls back to ORDER when no alphanumeric suffix exists", () => {
    // 英数字がない壊れた注文 ID でも、請求書番号の生成を止めないことを確認する。
    expect(extractOrderIdSuffix("!!!")).toBe("ORDER")
  })
})
