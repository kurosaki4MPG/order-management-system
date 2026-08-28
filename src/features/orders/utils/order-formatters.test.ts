import { describe, expect, it } from "vitest"

import {
  currencyFormatter,
  dateTimeFormatter,
  paymentMethodLabels,
  shortDateTimeFormatter,
} from "@/features/orders/utils/order-formatters"

// 表示用の文言とフォーマット関数が、画面表示でそのまま使えることを確認する。
describe("paymentMethodLabels", () => {
  // 支払い方法のラベルが日本語の表示名に対応していることを確認する。
  it("maps payment methods to display labels", () => {
    // クレジットカードの表示ラベルを確認する。
    expect(paymentMethodLabels["credit-card"]).toBe("クレジットカード")
    // 銀行振込の表示ラベルを確認する。
    expect(paymentMethodLabels["bank-transfer"]).toBe("銀行振込")
    // 代金引換の表示ラベルを確認する。
    expect(paymentMethodLabels["cash-on-delivery"]).toBe("代金引換")
  })
})

// 日時フォーマットが、一覧や詳細画面で期待する表記になることを確認する。
describe("date formatters", () => {
  // UTC の入力を ja-JP 表記へ変換できることを検証する。
  it("formats date and time in ja-JP", () => {
    const date = new Date("2026-08-27T00:05:00.000Z")

    // 詳細表示向けの日時フォーマットを確認する。
    expect(dateTimeFormatter.format(date)).toBe("2026/08/27 09:05")
    // 一覧表示向けの短縮日時フォーマットを確認する。
    expect(shortDateTimeFormatter.format(date)).toBe("08/27 09:05")
  })
})

// 金額の表示が日本円の見た目に揃うことを確認する。
describe("currencyFormatter", () => {
  // 桁区切りと通貨記号が期待通りになることを検証する。
  it("formats yen amounts", () => {
    // 円表記のフォーマット結果を確認する。
    expect(currencyFormatter.format(123456)).toBe("￥123,456")
  })
})

// 型外のキーが入ったときの落ち方を確認する。
describe("invalid formatter access", () => {
  // 定義外の支払い方法ラベルは存在しないことを確認する。
  it("returns undefined for an unsupported payment method", () => {
    const unsupportedKey = "bank-transfer-extra" as keyof typeof paymentMethodLabels

    expect(paymentMethodLabels[unsupportedKey]).toBeUndefined()
  })
})
