import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createOrder,
  deleteOrder,
  fetchOrder,
  fetchOrderStatus,
  fetchOrders,
  updateOrderStatus,
  type OrderListResponse,
} from "@/features/orders/api/order-api";
import type { OrderFormValues } from "@/features/orders/schemas/order-schema";
import type { Order, OrderStatus } from "@/features/orders/types/order";
import type { PaymentMethod } from "@/features/orders/types/order";

// React Query のキーを階層化して、一覧・詳細・ステータスを安全に分離する。
const orderQueryKeys = {
  all: ["orders"] as const,
  detail: (orderId: string) =>
    [...orderQueryKeys.all, "detail", orderId] as const,
  list: (filters: OrderListFilters) =>
    [...orderQueryKeys.all, "list", filters] as const,
  status: (orderId: string) =>
    [...orderQueryKeys.all, "status", orderId] as const,
};

export type OrderListFilters = {
  paymentMethod?: PaymentMethod | "all" | null;
  query?: string | null;
  status?: OrderStatus | "all" | null;
};

function normalizeOrderListFilters(filters: OrderListFilters = {}) {
  // "all" は未指定として扱い、API 側に余計な条件を渡さない。
  return {
    paymentMethod:
      filters.paymentMethod && filters.paymentMethod !== "all"
        ? filters.paymentMethod
        : null,
    query: filters.query?.trim() || null,
    status: filters.status && filters.status !== "all" ? filters.status : null,
  };
}

export function useOrdersQuery(
  filters: OrderListFilters = {},
  initialData?: OrderListResponse
) {
  const normalizedFilters = normalizeOrderListFilters(filters);

  return useQuery({
    initialData,
    placeholderData: keepPreviousData,
    queryFn: () => fetchOrders(normalizedFilters),
    queryKey: orderQueryKeys.list(normalizedFilters),
  });
}

export function useOrderQuery(orderId: string, initialData?: Order) {
  return useQuery({
    initialData,
    queryFn: async () => {
      const response = await fetchOrder(orderId);
      return response.order;
    },
    queryKey: orderQueryKeys.detail(orderId),
  });
}

export function useOrderStatusQuery(orderId: string, initialData?: OrderStatus) {
  return useQuery({
    initialData,
    queryFn: async () => {
      const response = await fetchOrderStatus(orderId);
      return response.status;
    },
    queryKey: orderQueryKeys.status(orderId),
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: OrderFormValues) => createOrder(values),
    onSuccess: async () => {
      // 作成後は一覧を再取得してキャッシュを更新する。
      await queryClient.invalidateQueries({
        queryKey: orderQueryKeys.all,
      });
    },
  });
}

export function useUpdateOrderStatusMutation(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(orderId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orderQueryKeys.all,
      });
    },
  });
}

export function useDeleteOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => deleteOrder(orderId),
    onSuccess: async (_data, orderId) => {
      // 詳細キャッシュも消して、削除済みデータを残さない。
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orderQueryKeys.all,
        }),
        queryClient.removeQueries({
          queryKey: orderQueryKeys.detail(orderId),
        }),
      ]);
    },
  });
}

export { orderQueryKeys };
