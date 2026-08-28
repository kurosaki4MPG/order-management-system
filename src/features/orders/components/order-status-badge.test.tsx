import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import {
  OrderStatusBadge,
  getOrderStatusLabel,
} from "@/features/orders/components/order-status-badge"

// 注文ステータスの見た目とラベルが、全画面で同じ意味になることを確認する。
describe("order-status-badge", () => {
  // ラベル関数が、一覧や詳細で再利用できることを確認する。
  it("returns a readable label for each status", () => {
    // pending の表示ラベルを確認する。
    expect(getOrderStatusLabel("pending")).toBe("処理待ち")
    // processing の表示ラベルを確認する。
    expect(getOrderStatusLabel("processing")).toBe("処理中")
    // shipped の表示ラベルを確認する。
    expect(getOrderStatusLabel("shipped")).toBe("発送済み")
    // delivered の表示ラベルを確認する。
    expect(getOrderStatusLabel("delivered")).toBe("完了")
    // canceled の表示ラベルを確認する。
    expect(getOrderStatusLabel("canceled")).toBe("キャンセル")
  })

  // コンポーネントが、表示テキストと状態ごとの色クラスを持つことを確認する。
  it("renders the expected badge content and class", () => {
    render(<OrderStatusBadge status="processing" />)

    // バッジの表示文字列が画面に出ることを確認する。
    expect(screen.getByText("処理中")).toBeInTheDocument()
    // 背景色クラスが状態に応じて付くことを確認する。
    expect(screen.getByText("処理中")).toHaveClass("bg-sky-50")
    // 文字色クラスが状態に応じて付くことを確認する。
    expect(screen.getByText("処理中")).toHaveClass("text-sky-700")
  })

  // 型外の値が入ったときに、ラベル解決が失敗することを確認する。
  it("throws when an unsupported status is requested", () => {
    expect(() => getOrderStatusLabel("unknown" as never)).toThrow()
  })
})
