import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mutateAsyncMock = vi.fn()

vi.mock("@/features/orders/api/order-queries", () => ({
  useCreateOrderMutation: () => ({
    isPending: false,
    mutateAsync: mutateAsyncMock,
  }),
}))

import { ApiError } from "@/features/orders/api/order-api"
import { OrderForm } from "@/features/orders/components/order-form"

// 注文登録フォームが、入力・検証・成功表示を画面上で正しく扱うことを確認する。
describe("OrderForm", () => {
  beforeEach(() => {
    mutateAsyncMock.mockReset()
  })

  // 空のまま送信すると、必須項目のバリデーションが表示されることを確認する。
  it("shows validation errors when submitted empty", async () => {
    render(<OrderForm />)

    fireEvent.click(screen.getByRole("button", { name: "注文を登録" }))

    // 顧客名の必須エラーが表示されることを確認する。
    expect(
      await screen.findByText("顧客名を入力してください")
    ).toBeInTheDocument()
    // 商品名の必須エラーが表示されることを確認する。
    expect(
      await screen.findByText("商品名を入力してください")
    ).toBeInTheDocument()
  })

  // 必須情報を入力すると、登録 mutation が呼ばれて成功メッセージが出ることを確認する。
  it("submits a valid order and shows success feedback", async () => {
    mutateAsyncMock.mockResolvedValue({
      id: "ORD-TEST-001",
      totalAmount: 3700,
    })

    render(<OrderForm />)

    // 顧客情報を入力する。
    fireEvent.change(screen.getByLabelText("顧客名"), {
      target: { value: "山田 太郎" },
    })
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "yamada@example.com" },
    })
    fireEvent.change(screen.getByLabelText("配送先住所"), {
      target: { value: "東京都千代田区1-1-1" },
    })
    fireEvent.change(screen.getByLabelText("支払い方法"), {
      target: { value: "bank-transfer" },
    })
    fireEvent.change(screen.getByLabelText("備考"), {
      target: { value: "至急発送" },
    })

    // 明細入力を更新して、合計金額の自動計算が反映される状態を作る。
    fireEvent.change(screen.getByLabelText("商品名"), {
      target: { value: "商品A" },
    })
    fireEvent.change(screen.getByLabelText("数量"), {
      target: { value: "2" },
    })
    fireEvent.change(screen.getByLabelText("単価"), {
      target: { value: "1850" },
    })

    fireEvent.click(screen.getByRole("button", { name: "注文を登録" }))

    await waitFor(() => {
      // 登録 mutation に、フォームの入力内容がそのまま渡ることを確認する。
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: "山田 太郎",
          customerEmail: "yamada@example.com",
          shippingAddress: "東京都千代田区1-1-1",
          paymentMethod: "bank-transfer",
          note: "至急発送",
        })
      )
    })

    // 登録完了の成功メッセージが表示されることを確認する。
    expect(await screen.findByRole("status")).toHaveTextContent(
      "注文を登録しました。"
    )
    // 合計金額が成功表示に含まれることを確認する。
    expect(screen.getByRole("status")).toHaveTextContent("￥3,700")
  })

  // API が 400 を返した場合は、入力エラーを表示することを確認する。
  it("shows a validation message when the API returns 400", async () => {
    mutateAsyncMock.mockRejectedValue(
      new ApiError("入力エラー", 400, {
        issues: {
          customerName: ["顧客名を入力してください"],
        },
      })
    )

    render(<OrderForm />)

    fireEvent.change(screen.getByLabelText("顧客名"), {
      target: { value: "山田 太郎" },
    })
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "yamada@example.com" },
    })
    fireEvent.change(screen.getByLabelText("配送先住所"), {
      target: { value: "東京都千代田区1-1-1" },
    })
    fireEvent.change(screen.getByLabelText("商品名"), {
      target: { value: "商品A" },
    })
    fireEvent.change(screen.getByLabelText("数量"), {
      target: { value: "1" },
    })
    fireEvent.change(screen.getByLabelText("単価"), {
      target: { value: "1200" },
    })
    fireEvent.click(screen.getByRole("button", { name: "注文を登録" }))

    // API 由来の入力不備メッセージが画面に出ることを確認する。
    expect(
      await screen.findByText("顧客名を入力してください")
    ).toBeInTheDocument()
  })

  // 想定外エラー時には一般的な失敗メッセージになることを確認する。
  it("shows a generic error when the mutation fails unexpectedly", async () => {
    mutateAsyncMock.mockRejectedValue(new Error("network error"))

    render(<OrderForm />)

    fireEvent.change(screen.getByLabelText("顧客名"), {
      target: { value: "山田 太郎" },
    })
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "yamada@example.com" },
    })
    fireEvent.change(screen.getByLabelText("配送先住所"), {
      target: { value: "東京都千代田区1-1-1" },
    })
    fireEvent.change(screen.getByLabelText("商品名"), {
      target: { value: "商品A" },
    })
    fireEvent.change(screen.getByLabelText("数量"), {
      target: { value: "1" },
    })
    fireEvent.change(screen.getByLabelText("単価"), {
      target: { value: "1200" },
    })
    fireEvent.click(screen.getByRole("button", { name: "注文を登録" }))

    // 想定外エラー時の一般メッセージが表示されることを確認する。
    expect(
      await screen.findByText(
        "注文登録に失敗しました。入力内容を確認して再実行してください。"
      )
    ).toBeInTheDocument()
  })

  // 画面の主要セクションが表示され、フォームのレイアウトが崩れていないことを確認する。
  it("renders the main form sections and actions", () => {
    render(<OrderForm />)

    // 顧客情報セクションが表示されることを確認する。
    expect(screen.getByText("顧客情報")).toBeInTheDocument()
    // 注文商品セクションが表示されることを確認する。
    expect(screen.getByText("注文商品")).toBeInTheDocument()
    // 注文合計の表示領域が表示されることを確認する。
    expect(screen.getByText("注文合計")).toBeInTheDocument()
    // 商品追加ボタンが表示されることを確認する。
    expect(screen.getByRole("button", { name: "商品を追加" })).toBeInTheDocument()
    // 送信ボタンが表示されることを確認する。
    expect(screen.getByRole("button", { name: "注文を登録" })).toBeInTheDocument()
  })

  // 商品行の追加と削除ができ、明細行の増減が画面に反映されることを確認する。
  it("adds and removes order item rows", () => {
    render(<OrderForm />)

    // 初期状態では明細行が 1 行だけ表示されることを確認する。
    expect(screen.getAllByLabelText("商品名")).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: "商品を追加" }))

    // 追加ボタンで明細行が増えることを確認する。
    expect(screen.getAllByLabelText("商品名")).toHaveLength(2)
    expect(screen.getAllByRole("button", { name: "商品を削除" })).toHaveLength(2)

    fireEvent.click(screen.getAllByRole("button", { name: "商品を削除" })[1])

    // 削除ボタンで明細行が元に戻ることを確認する。
    expect(screen.getAllByLabelText("商品名")).toHaveLength(1)
  })

  // 送信中はボタンが無効になり、二重送信を抑止することを確認する。
  it("disables the submit button while the mutation is pending", async () => {
    let resolveMutation:
      | ((value: { id: string; totalAmount: number }) => void)
      | undefined
    const pendingMutation = new Promise<{ id: string; totalAmount: number }>(
      (resolve) => {
        resolveMutation = resolve
      }
    )

    mutateAsyncMock.mockReturnValue(pendingMutation)

    render(<OrderForm />)

    fireEvent.change(screen.getByLabelText("顧客名"), {
      target: { value: "山田 太郎" },
    })
    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "yamada@example.com" },
    })
    fireEvent.change(screen.getByLabelText("配送先住所"), {
      target: { value: "東京都千代田区1-1-1" },
    })
    fireEvent.change(screen.getByLabelText("商品名"), {
      target: { value: "商品A" },
    })
    fireEvent.change(screen.getByLabelText("数量"), {
      target: { value: "1" },
    })
    fireEvent.change(screen.getByLabelText("単価"), {
      target: { value: "1200" },
    })

    fireEvent.click(screen.getByRole("button", { name: "注文を登録" }))

    // 送信中はボタンが無効になっていることを確認する。
    expect(screen.getByRole("button", { name: "注文を登録" })).toBeDisabled()

    await act(async () => {
      resolveMutation?.({
        id: "ORD-TEST-001",
        totalAmount: 1200,
      })
    })
  })
})
