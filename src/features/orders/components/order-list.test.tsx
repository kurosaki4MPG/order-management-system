import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Order } from "@/features/orders/types/order"

const { deleteOrderMutationMock, useOrdersQueryMock } = vi.hoisted(() => ({
  deleteOrderMutationMock: vi.fn(),
  useOrdersQueryMock: vi.fn(),
}))

vi.mock("@/features/orders/api/order-queries", () => ({
  useDeleteOrderMutation: () => ({
    isPending: false,
    mutateAsync: deleteOrderMutationMock,
  }),
  useOrdersQuery: (...args: unknown[]) => useOrdersQueryMock(...args),
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

import { OrderList } from "@/features/orders/components/order-list"

const sampleOrders: Order[] = [
  {
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
        quantity: 1,
        unitPrice: 1200,
      },
    ],
    totalAmount: 1200,
  },
  {
    id: "ORD-002",
    orderedAt: "2026-08-27T02:00:00.000Z",
    customerName: "佐藤 花子",
    customerEmail: "sato@example.com",
    shippingAddress: "東京都港区2-2-2",
    status: "shipped",
    paymentMethod: "bank-transfer",
    items: [
      {
        productName: "商品B",
        quantity: 2,
        unitPrice: 1800,
      },
    ],
    totalAmount: 3600,
  },
]

type OrdersQueryState = {
  data?: { orders: Order[]; total: number }
  isError: boolean
  isFetching: boolean
  isLoading: boolean
}

let ordersQueryState: OrdersQueryState = {
  data: { orders: sampleOrders, total: sampleOrders.length },
  isError: false,
  isFetching: false,
  isLoading: false,
}

// 注文一覧は、一覧表示・検索・絞り込み・削除・空状態・エラー状態を同じ画面で扱う。
describe("OrderList", () => {
  beforeEach(() => {
    ordersQueryState = {
      data: { orders: sampleOrders, total: sampleOrders.length },
      isError: false,
      isFetching: false,
      isLoading: false,
    }
    useOrdersQueryMock.mockImplementation((filters, initialData) => ({
      ...ordersQueryState,
      data:
        ordersQueryState.data ??
        initialData ??
        ({ orders: [], total: 0 } as const),
      filters,
      initialData,
    }))
    deleteOrderMutationMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  // 一覧は注文行を描画し、検索・絞り込み・削除の入口を表示することを確認する。
  it("renders orders and updates filters before deleting an order", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    deleteOrderMutationMock.mockResolvedValue(true)

    render(<OrderList initialOrders={sampleOrders} />)

    // 注文番号が一覧に表示されることを確認する。
    expect(screen.getByText("ORD-001")).toBeInTheDocument()
    // もう一件の注文も一覧に表示されることを確認する。
    expect(screen.getByText("ORD-002")).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText("注文番号、顧客名、商品名で検索"), {
      target: { value: "山田" },
    })
    fireEvent.change(screen.getByLabelText("ステータス"), {
      target: { value: "shipped" },
    })
    fireEvent.change(screen.getByLabelText("支払い方法"), {
      target: { value: "bank-transfer" },
    })

    await waitFor(() => {
      // フィルター状態が hook にそのまま渡ることを確認する。
      expect(useOrdersQueryMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          paymentMethod: "bank-transfer",
          query: "山田",
          status: "shipped",
        }),
        undefined
      )
    })

    const summarySection = screen.getByLabelText("注文ステータス集計")
    const shippedSummary = within(summarySection).getByText("発送済み").closest("button")
    // ステータス集計の選択状態が反映されることを確認する。
    expect(shippedSummary).toHaveClass("border-primary")

    fireEvent.click(screen.getByRole("button", { name: "ORD-001 を削除" }))

    await waitFor(() => {
      // 確認後に削除 mutation が呼ばれることを確認する。
      expect(confirmSpy).toHaveBeenCalled()
      expect(deleteOrderMutationMock).toHaveBeenCalledWith("ORD-001")
    })
  })

  // 検索結果が空になったときは、空状態メッセージを表示することを確認する。
  it("shows an empty message when no orders match", () => {
    ordersQueryState = {
      data: { orders: [], total: 0 },
      isError: false,
      isFetching: false,
      isLoading: false,
    }

    render(<OrderList initialOrders={[]} />)

    // 条件一致なしのメッセージが出ることを確認する。
    expect(
      screen.getByText("条件に一致する注文はありません。")
    ).toBeInTheDocument()
  })

  // 読み込み中はテーブルを出さず、スケルトンを表示することを確認する。
  it("shows a loading skeleton while the list is fetching", () => {
    ordersQueryState = {
      data: undefined,
      isError: false,
      isFetching: true,
      isLoading: true,
    }

    render(<OrderList initialOrders={[]} />)

    // 読み込み中の状態表示が出ることを確認する。
    expect(screen.getByText("同期中...")).toBeInTheDocument()
    // 読み込み中はテーブル本体がまだ描画されないことを確認する。
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  // 以前の結果がある状態で再取得に失敗した場合は警告を出すことを確認する。
  it("shows a stale-data warning when refetch fails", () => {
    ordersQueryState = {
      data: { orders: sampleOrders, total: sampleOrders.length },
      isError: true,
      isFetching: false,
      isLoading: false,
    }

    render(<OrderList initialOrders={sampleOrders} />)

    // 前回の結果を表示しつつ再取得失敗の警告が出ることを確認する。
    expect(
      screen.getByText("一覧の再取得に失敗しました。前回の結果を表示しています。")
    ).toBeInTheDocument()
  })

  // 一覧の主要な見出しと列構成が表示され、レイアウト要素が揃っていることを確認する。
  it("renders the main list sections and table headers", () => {
    render(<OrderList initialOrders={sampleOrders} />)

    // ステータス集計セクションが表示されることを確認する。
    expect(screen.getByLabelText("注文ステータス集計")).toBeInTheDocument()
    // 一覧カードの見出しが表示されることを確認する。
    expect(screen.getByText("注文一覧")).toBeInTheDocument()
    // 検索ボックスが表示されることを確認する。
    expect(
      screen.getByPlaceholderText("注文番号、顧客名、商品名で検索")
    ).toBeInTheDocument()
    const table = screen.getByRole("table")
    // テーブルの列見出しが表示されることを確認する。
    expect(within(table).getByText("注文番号")).toBeInTheDocument()
    expect(within(table).getByText("注文日時")).toBeInTheDocument()
    expect(within(table).getByText("顧客")).toBeInTheDocument()
    expect(within(table).getByText("商品")).toBeInTheDocument()
    expect(within(table).getByText("支払い")).toBeInTheDocument()
    expect(within(table).getByText("ステータス")).toBeInTheDocument()
    expect(within(table).getByText("合計")).toBeInTheDocument()
    expect(within(table).getByText("操作")).toBeInTheDocument()
  })
})
