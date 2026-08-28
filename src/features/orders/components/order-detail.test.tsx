import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Order } from "@/features/orders/types/order"

const {
  deleteOrderMutationMock,
  routerPushMock,
  updateOrderStatusMutationMock,
  useOrderQueryMock,
} = vi.hoisted(() => ({
  deleteOrderMutationMock: vi.fn(),
  routerPushMock: vi.fn(),
  updateOrderStatusMutationMock: vi.fn(),
  useOrderQueryMock: vi.fn(),
}))

vi.mock("@/features/orders/api/order-queries", () => ({
  useDeleteOrderMutation: () => ({
    isPending: false,
    mutateAsync: deleteOrderMutationMock,
  }),
  useOrderQuery: (...args: unknown[]) => useOrderQueryMock(...args),
  useUpdateOrderStatusMutation: () => ({
    isPending: false,
    mutateAsync: updateOrderStatusMutationMock,
  }),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode
    href: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}))

import { OrderDetail } from "@/features/orders/components/order-detail"

const sampleOrder: Order = {
  id: "ORD-001",
  orderedAt: "2026-08-27T00:00:00.000Z",
  customerName: "山田 太郎",
  customerEmail: "yamada@example.com",
  shippingAddress: "東京都千代田区1-1-1",
  status: "pending",
  paymentMethod: "credit-card",
  items: [
    {
      productName: "商品A",
      quantity: 2,
      unitPrice: 1200,
    },
  ],
  totalAmount: 2400,
}

type OrderQueryState = {
  data?: Order
  isError: boolean
  isFetching: boolean
  isLoading: boolean
}

let orderQueryState: OrderQueryState = {
  data: sampleOrder,
  isError: false,
  isFetching: false,
  isLoading: false,
}

// 注文詳細は、表示・読み込み・未存在・削除導線を 1 画面で扱う。
describe("OrderDetail", () => {
  beforeEach(() => {
    orderQueryState = {
      data: sampleOrder,
      isError: false,
      isFetching: false,
      isLoading: false,
    }
    useOrderQueryMock.mockImplementation((_orderId, initialOrder) => ({
      ...orderQueryState,
      data: orderQueryState.data ?? initialOrder,
    }))
    deleteOrderMutationMock.mockReset()
    routerPushMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  // 詳細画面は注文情報を描画し、削除後は一覧へ戻ることを確認する。
  it("renders an order detail and navigates back after deleting", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    deleteOrderMutationMock.mockResolvedValue(true)

    render(<OrderDetail orderId="ORD-001" initialOrder={sampleOrder} />)

    // 注文 ID が見えることを確認する。
    expect(screen.getByText("ORD-001")).toBeInTheDocument()
    // 顧客名が見えることを確認する。
    expect(screen.getByText("山田 太郎")).toBeInTheDocument()
    // 注文商品テーブルが見えることを確認する。
    expect(screen.getByText("商品A")).toBeInTheDocument()
    // ステータス更新パネルが表示されることを確認する。
    expect(screen.getByText("ステータス更新")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "削除" }))

    await waitFor(() => {
      // 削除確認の後に API が呼ばれることを確認する。
      expect(confirmSpy).toHaveBeenCalled()
      expect(deleteOrderMutationMock).toHaveBeenCalledWith("ORD-001")
      // 削除後は一覧へ戻ることを確認する。
      expect(routerPushMock).toHaveBeenCalledWith("/orders")
    })
  })

  // 読み込み中はスケルトンを表示して、画面の揺れを防ぐことを確認する。
  it("shows a loading skeleton while the order is being fetched", () => {
    orderQueryState = {
      data: undefined,
      isError: false,
      isFetching: false,
      isLoading: true,
    }

    render(<OrderDetail orderId="ORD-001" />)

    // 読み込み中の文言が表示されることを確認する。
    expect(screen.getByText("注文詳細を取得中")).toBeInTheDocument()
    // 取得完了前は詳細テーブルがまだ存在しないことを確認する。
    expect(screen.queryByText("商品A")).not.toBeInTheDocument()
  })

  // 注文が見つからない場合は、未存在メッセージを表示することを確認する。
  it("shows a not-found message when the order is missing", () => {
    orderQueryState = {
      data: undefined,
      isError: false,
      isFetching: false,
      isLoading: false,
    }

    render(<OrderDetail orderId="ORD-NOT-FOUND" />)

    // 未存在の注文に対するメッセージが表示されることを確認する。
    expect(
      screen.getByText("注文詳細を取得できませんでした。注文ID: ORD-NOT-FOUND")
    ).toBeInTheDocument()
  })

  // 詳細画面の主要セクションが表示され、カード配置が揃っていることを確認する。
  it("renders the main detail sections and cards", () => {
    render(<OrderDetail orderId="ORD-001" initialOrder={sampleOrder} />)

    // 注文商品カードが表示されることを確認する。
    expect(screen.getByText("注文商品")).toBeInTheDocument()
    // ステータス更新カードが表示されることを確認する。
    expect(screen.getByText("ステータス更新")).toBeInTheDocument()
    // 顧客情報カードが表示されることを確認する。
    expect(screen.getByText("顧客情報")).toBeInTheDocument()
    // 配送・支払いカードが表示されることを確認する。
    expect(screen.getByText("配送・支払い")).toBeInTheDocument()
    // 合計表示が画面右上にあることを確認する。
    expect(screen.getAllByText("合計")).toHaveLength(2)
  })
})
