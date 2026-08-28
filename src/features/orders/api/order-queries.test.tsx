import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { OrderFormValues } from "@/features/orders/schemas/order-schema"
import type { Order } from "@/features/orders/types/order"
import {
  orderQueryKeys,
  useCreateOrderMutation,
  useDeleteOrderMutation,
  useOrderQuery,
  useOrderStatusQuery,
  useOrdersQuery,
  useUpdateOrderStatusMutation,
} from "@/features/orders/api/order-queries"

const {
  createOrderMock,
  deleteOrderMock,
  fetchOrderMock,
  fetchOrderStatusMock,
  fetchOrdersMock,
  updateOrderStatusMock,
} = vi.hoisted(() => ({
  createOrderMock: vi.fn(),
  deleteOrderMock: vi.fn(),
  fetchOrderMock: vi.fn(),
  fetchOrderStatusMock: vi.fn(),
  fetchOrdersMock: vi.fn(),
  updateOrderStatusMock: vi.fn(),
}))

vi.mock("@/features/orders/api/order-api", () => ({
  createOrder: createOrderMock,
  deleteOrder: deleteOrderMock,
  fetchOrder: fetchOrderMock,
  fetchOrderStatus: fetchOrderStatusMock,
  fetchOrders: fetchOrdersMock,
  updateOrderStatus: updateOrderStatusMock,
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  return { queryClient, Wrapper }
}

// TanStack Query のフックが、一覧取得・詳細取得・キャッシュ更新を正しく扱うことを確認する。
describe("order-queries", () => {
  beforeEach(() => {
    fetchOrdersMock.mockReset()
    fetchOrderMock.mockReset()
    fetchOrderStatusMock.mockReset()
    createOrderMock.mockReset()
    updateOrderStatusMock.mockReset()
    deleteOrderMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // 一覧取得はフィルターを正規化したうえで成功データを返すことを確認する。
  it("fetches orders with normalized filters", async () => {
    fetchOrdersMock.mockResolvedValue({
      orders: [
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
      ],
      total: 1,
    })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () =>
        useOrdersQuery({
          paymentMethod: "all",
          query: "  web  ",
          status: "all",
        }),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      // 一覧取得が成功状態になることを確認する。
      expect(result.current.isSuccess).toBe(true)
    })

    // "all" と余分な空白が取り除かれて API に渡ることを確認する。
    expect(fetchOrdersMock).toHaveBeenCalledWith({
      paymentMethod: null,
      query: "web",
      status: null,
    })
    // 取得した一覧データがフックの戻り値にそのまま入ることを確認する。
    expect(result.current.data).toEqual({
      orders: expect.any(Array),
      total: 1,
    })
  })

  // 一覧取得エラーは、そのまま error 状態として扱うことを確認する。
  it("surfaces errors when fetching orders fails", async () => {
    fetchOrdersMock.mockRejectedValue(new Error("network error"))

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useOrdersQuery(), { wrapper: Wrapper })

    await waitFor(() => {
      // 一覧取得がエラー状態になることを確認する。
      expect(result.current.isError).toBe(true)
    })

    // 下位 API の失敗理由がそのまま確認できることを確認する。
    expect(result.current.error).toMatchObject({
      message: "network error",
    })
  })

  // 詳細取得は注文データを返し、ID を正しく使うことを確認する。
  it("fetches a single order detail", async () => {
    const order: Order = {
      id: "ORD-001",
      orderedAt: "2026-08-27T00:00:00.000Z",
      customerName: "山田 太郎",
      customerEmail: "yamada@example.com",
      shippingAddress: "東京都千代田区1-1-1",
      status: "processing",
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

    fetchOrderMock.mockResolvedValue({ order })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useOrderQuery("ORD-001"), {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      // 詳細取得が成功状態になることを確認する。
      expect(result.current.isSuccess).toBe(true)
    })

    // 注文 ID が詳細取得に使われることを確認する。
    expect(fetchOrderMock).toHaveBeenCalledWith("ORD-001")
    // フックの結果として注文本体が返ることを確認する。
    expect(result.current.data).toEqual(order)
  })

  // ステータス取得は注文 ID に応じた単票を返すことを確認する。
  it("fetches the current order status", async () => {
    fetchOrderStatusMock.mockResolvedValue({
      status: "processing",
    })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useOrderStatusQuery("ORD-001"), {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      // ステータス取得が成功状態になることを確認する。
      expect(result.current.isSuccess).toBe(true)
    })

    // 注文 ID がステータス取得に使われることを確認する。
    expect(fetchOrderStatusMock).toHaveBeenCalledWith("ORD-001")
    // フックの結果として現在ステータスが返ることを確認する。
    expect(result.current.data).toBe("processing")
  })

  // ステータス取得失敗は、そのまま error 状態として扱うことを確認する。
  it("surfaces errors when fetching order status fails", async () => {
    fetchOrderStatusMock.mockRejectedValue(new Error("status error"))

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useOrderStatusQuery("ORD-001"), {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      // ステータス取得がエラー状態になることを確認する。
      expect(result.current.isError).toBe(true)
    })

    // 下位 API の失敗理由がそのまま確認できることを確認する。
    expect(result.current.error).toMatchObject({
      message: "status error",
    })
  })

  // 作成 mutation は成功後に一覧キャッシュを無効化することを確認する。
  it("invalidates cached order queries after creating an order", async () => {
    createOrderMock.mockResolvedValue({
      id: "ORD-NEW-001",
      status: "pending",
      totalAmount: 1200,
    })

    const { queryClient, Wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(() => useCreateOrderMutation(), {
      wrapper: Wrapper,
    })

    const values = {
      customerName: "山田 太郎",
      customerEmail: "yamada@example.com",
      shippingAddress: "東京都千代田区1-1-1",
      paymentMethod: "credit-card",
      items: [
        {
          productName: "商品A",
          quantity: 1,
          unitPrice: 1200,
        },
      ],
    } satisfies OrderFormValues

    await result.current.mutateAsync(values)

    // 作成成功後に一覧系キャッシュが無効化されることを確認する。
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderQueryKeys.all,
    })
  })

  // 更新 mutation は成功後に一覧キャッシュを無効化することを確認する。
  it("invalidates cached order queries after updating an order status", async () => {
    updateOrderStatusMock.mockResolvedValue({
      id: "ORD-001",
      orderedAt: "2026-08-27T00:00:00.000Z",
      customerName: "山田 太郎",
      customerEmail: "yamada@example.com",
      shippingAddress: "東京都千代田区1-1-1",
      status: "shipped",
      paymentMethod: "credit-card",
      items: [],
      totalAmount: 0,
    })

    const { queryClient, Wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(
      () => useUpdateOrderStatusMutation("ORD-001"),
      {
        wrapper: Wrapper,
      }
    )

    await result.current.mutateAsync("shipped")

    // ステータス更新後に一覧系キャッシュが無効化されることを確認する。
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderQueryKeys.all,
    })
  })

  // 削除 mutation は詳細キャッシュを消し、一覧キャッシュも無効化することを確認する。
  it("removes detail cache and invalidates lists after deleting an order", async () => {
    deleteOrderMock.mockResolvedValue({
      deleted: true,
      orderId: "ORD-001",
    })

    const { queryClient, Wrapper } = createWrapper()
    queryClient.setQueryData(orderQueryKeys.detail("ORD-001"), {
      id: "ORD-001",
      orderedAt: "2026-08-27T00:00:00.000Z",
      customerName: "山田 太郎",
      customerEmail: "yamada@example.com",
      shippingAddress: "東京都千代田区1-1-1",
      status: "pending",
      paymentMethod: "credit-card",
      items: [],
      totalAmount: 0,
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const removeSpy = vi.spyOn(queryClient, "removeQueries")

    const { result } = renderHook(() => useDeleteOrderMutation(), {
      wrapper: Wrapper,
    })

    await result.current.mutateAsync("ORD-001")

    // 一覧系キャッシュが無効化されることを確認する。
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderQueryKeys.all,
    })
    // 詳細キャッシュが明示的に削除されることを確認する。
    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: orderQueryKeys.detail("ORD-001"),
    })
    // 削除後は詳細キャッシュが残らないことを確認する。
    expect(queryClient.getQueryData(orderQueryKeys.detail("ORD-001"))).toBeUndefined()
  })
})
