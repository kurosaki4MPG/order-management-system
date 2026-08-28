import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/features/orders/api/order-api"

const mutateAsyncMock = vi.fn()

vi.mock("@/features/orders/api/order-queries", () => ({
  useUpdateOrderStatusMutation: () => ({
    isPending: false,
    mutateAsync: mutateAsyncMock,
  }),
}))

import { OrderStatusManager } from "@/features/orders/components/order-status-manager"

// ステータス更新パネルが、変更・更新・履歴表示を正しく扱うことを確認する。
describe("OrderStatusManager", () => {
  beforeEach(() => {
    mutateAsyncMock.mockReset()
  })

  // 初期表示では変更がなく、更新操作が無効であることを確認する。
  it("keeps update disabled when no status change exists", () => {
    render(<OrderStatusManager initialStatus="pending" orderId="ORD-001" />)

    const currentStatusSection = screen.getByText("現在のステータス")
      .parentElement as HTMLElement

    // 現在のステータスが画面に表示されることを確認する。
    expect(within(currentStatusSection).getByText("処理待ち")).toBeInTheDocument()
    // 変更がないため更新ボタンが押せないことを確認する。
    expect(screen.getByRole("button", { name: "更新" })).toBeDisabled()
    // 変更がないため戻すボタンも押せないことを確認する。
    expect(screen.getByRole("button", { name: "戻す" })).toBeDisabled()
  })

  // ステータスを変更して更新すると、mutation が呼ばれ履歴が追加されることを確認する。
  it("applies a status change and shows the update history", async () => {
    mutateAsyncMock.mockResolvedValue({
      status: "shipped",
    })

    render(<OrderStatusManager initialStatus="pending" orderId="ORD-001" />)

    fireEvent.change(screen.getByLabelText("変更後ステータス"), {
      target: { value: "shipped" },
    })

    // 変更後に更新ボタンが有効になることを確認する。
    expect(screen.getByRole("button", { name: "更新" })).toBeEnabled()
    fireEvent.click(screen.getByRole("button", { name: "更新" }))

    await waitFor(() => {
      // 更新 mutation に新しいステータスが渡ることを確認する。
      expect(mutateAsyncMock).toHaveBeenCalledWith("shipped")
    })

    const currentStatusSection = screen.getByText("現在のステータス")
      .parentElement as HTMLElement

    // 更新後に現在ステータスが反映されることを確認する。
    expect(within(currentStatusSection).getByText("発送済み")).toBeInTheDocument()
    // 更新履歴が 1 件追加されることを確認する。
    expect(screen.getByText("1 回更新")).toBeInTheDocument()
  })

  // API エラーが返った場合は、エラーメッセージを画面に出すことを確認する。
  it("shows an API error message when the mutation fails with ApiError", async () => {
    mutateAsyncMock.mockRejectedValue(new ApiError("更新失敗", 500))

    render(<OrderStatusManager initialStatus="pending" orderId="ORD-001" />)

    fireEvent.change(screen.getByLabelText("変更後ステータス"), {
      target: { value: "shipped" },
    })
    fireEvent.click(screen.getByRole("button", { name: "更新" }))

    // API 失敗時にエラーメッセージが表示されることを確認する。
    expect(await screen.findByText("更新失敗")).toBeInTheDocument()
  })
})
