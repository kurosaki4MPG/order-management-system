import { ApiError, requestJson } from "@/lib/api-client";
import type {
  OrderFormValues,
  UpdateOrderStatusValues,
} from "@/features/orders/schemas/order-schema";
import type {
  Order,
  OrderStatus,
  PaymentMethod,
} from "@/features/orders/types/order";

// フロントエンドはこの層だけを使い、URL や HTTP メソッドの詳細を意識しない。
export type OrderListFilters = {
  paymentMethod?: PaymentMethod | "all" | null;
  query?: string | null;
  status?: OrderStatus | "all" | null;
};

export type OrderListResponse = {
  orders: Order[];
  total: number;
};

export type OrderDetailResponse = {
  order: Order;
};

export type OrderStatusResponse = {
  status: OrderStatus;
};

export type CreatedOrderResponse = {
  order: Pick<Order, "id" | "status" | "totalAmount">;
};

export type DeletedOrderResponse = {
  deleted: boolean;
  orderId: string;
};

export { ApiError };

export async function fetchOrders(filters: OrderListFilters = {}) {
  // 一覧取得のクエリ組み立てはここに集約する。
  return requestJson<OrderListResponse>("/api/orders", {
    query: {
      paymentMethod: filters.paymentMethod,
      query: filters.query,
      status: filters.status,
    },
  });
}

export async function fetchOrder(orderId: string) {
  return requestJson<OrderDetailResponse>(
    `/api/orders/${encodeURIComponent(orderId)}`
  );
}

export async function fetchOrderStatus(orderId: string) {
  return requestJson<OrderStatusResponse>(
    `/api/orders/${encodeURIComponent(orderId)}/status`
  );
}

export async function createOrder(values: OrderFormValues) {
  // 登録は POST に統一する。
  const response = await requestJson<CreatedOrderResponse, OrderFormValues>(
    "/api/orders",
    {
      body: values,
      method: "POST",
    }
  );

  return response.order;
}

export async function updateOrderStatus(
  orderId: string,
  status: UpdateOrderStatusValues["status"]
) {
  // ステータス更新は専用エンドポイントへ送る。
  const response = await requestJson<OrderDetailResponse, UpdateOrderStatusValues>(
    `/api/orders/${encodeURIComponent(orderId)}/status`,
    {
      body: { status },
      method: "PATCH",
    }
  );

  return response.order;
}

export async function deleteOrder(orderId: string) {
  return requestJson<DeletedOrderResponse>(
    `/api/orders/${encodeURIComponent(orderId)}`,
    {
      method: "DELETE",
    }
  );
}
