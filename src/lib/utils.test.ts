import { describe, expect, it } from "vitest"

import { cn } from "@/lib/utils"

// `cn` が Tailwind のクラス結合を壊さず、条件付きクラスを素直にまとめられることを確認する。
describe("cn", () => {
  // 既存クラスと条件付きクラスを混ぜても、不要な値を落として結合できることを検証する。
  it("merges class names", () => {
    expect(cn("px-2", false && "px-4", "py-1")).toBe("px-2 py-1")
  })

  // 空入力でも安全に空文字列を返せることを確認する。
  it("returns an empty string for empty input", () => {
    expect(cn()).toBe("")
  })
})
