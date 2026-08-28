import { describe, expect, it } from "vitest"

import {
  orderFormSchema,
  orderItemSchema,
  updateOrderStatusSchema,
} from "@/features/orders/schemas/order-schema"

// 注文登録とステータス更新の入力検証が、業務ルールどおりに動くことを確認する。
describe("orderItemSchema", () => {
  // 正常な明細がそのまま通ることを確認する。
  it("accepts a valid order item", () => {
    const result = orderItemSchema.safeParse({
      productName: "商品A",
      quantity: 2,
      unitPrice: 1500,
    })

    // 正常な明細が通過することを確認する。
    expect(result.success).toBe(true)
  })

  // 数量の小数入力を拒否し、明確なエラーメッセージを返すことを確認する。
  it("rejects a non-integer quantity", () => {
    const result = orderItemSchema.safeParse({
      productName: "商品A",
      quantity: 1.5,
      unitPrice: 1500,
    })

    // 小数の数量が拒否されることを確認する。
    expect(result.success).toBe(false)
    if (!result.success) {
      // 数量のエラーメッセージが期待どおりであることを確認する。
      expect(result.error.issues[0]?.message).toBe(
        "数量は整数で入力してください"
      )
    }
  })
})

// 注文フォーム全体のバリデーションが、必須項目や文字数制限を守ることを確認する。
describe("orderFormSchema", () => {
  // すべての必須値が揃っている場合に通ることを確認する。
  it("accepts a valid order form", () => {
    const result = orderFormSchema.safeParse({
      customerName: "山田 太郎",
      customerEmail: "yamada@example.com",
      shippingAddress: "東京都千代田区1-1-1",
      paymentMethod: "credit-card",
      note: "至急発送",
      items: [
        {
          productName: "商品A",
          quantity: 1,
          unitPrice: 1200,
        },
      ],
    })

    // 必須項目が揃った注文フォームが通過することを確認する。
    expect(result.success).toBe(true)
  })

  // 明細が 0 件の注文を拒否できることを確認する。
  it("rejects an empty item list", () => {
    const result = orderFormSchema.safeParse({
      customerName: "山田 太郎",
      customerEmail: "yamada@example.com",
      shippingAddress: "東京都千代田区1-1-1",
      paymentMethod: "credit-card",
      items: [],
    })

    // 明細が 0 件の注文フォームが拒否されることを確認する。
    expect(result.success).toBe(false)
    if (!result.success) {
      // 明細不足時のメッセージが期待どおりであることを確認する。
      expect(result.error.issues[0]?.message).toBe(
        "商品を1件以上入力してください"
      )
    }
  })

  // 備考欄の長さ制限が効くことを確認する。
  it("rejects a note longer than 200 characters", () => {
    const result = orderFormSchema.safeParse({
      customerName: "山田 太郎",
      customerEmail: "yamada@example.com",
      shippingAddress: "東京都千代田区1-1-1",
      paymentMethod: "credit-card",
      note: "a".repeat(201),
      items: [
        {
          productName: "商品A",
          quantity: 1,
          unitPrice: 1200,
        },
      ],
    })

    // 備考の文字数上限を超えた入力が拒否されることを確認する。
    expect(result.success).toBe(false)
    if (!result.success) {
      // 備考上限超過時のメッセージが期待どおりであることを確認する。
      expect(result.error.issues[0]?.message).toBe("備考は200文字以内で入力してください")
    }
  })
})

// 注文ステータスの更新時に、許可された値だけ通ることを確認する。
describe("updateOrderStatusSchema", () => {
  // 許可済みステータスはそのまま受け入れる。
  it("accepts a supported status", () => {
    const result = updateOrderStatusSchema.safeParse({ status: "processing" })

    // 許可済みステータスが通過することを確認する。
    expect(result.success).toBe(true)
  })

  // 未定義のステータスは拒否される。
  it("rejects an unsupported status", () => {
    const result = updateOrderStatusSchema.safeParse({
      status: "unknown",
    })

    // 未定義ステータスが拒否されることを確認する。
    expect(result.success).toBe(false)
  })
})

// 型の外側から来る不正値の境界を確認する。
describe("schema runtime edge cases", () => {
  // 空のメールアドレスが拒否されることを確認する。
  it("rejects an empty email address", () => {
    const result = orderFormSchema.safeParse({
      customerName: "山田 太郎",
      customerEmail: "",
      shippingAddress: "東京都千代田区1-1-1",
      paymentMethod: "credit-card",
      items: [
        {
          productName: "商品A",
          quantity: 1,
          unitPrice: 1200,
        },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "メールアドレスを入力してください"
      )
    }
  })
})
