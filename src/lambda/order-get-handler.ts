// 学習段階の注文取得ハンドラ。GET の一覧/詳細を分けずに確認するための最小実装。
import {
  getOrderById,
  searchOrders,
} from "@/features/orders/services/order-service";
import type { Order, OrderStatus, PaymentMethod } from "@/features/orders/types/order";

type ApiGatewayEvent = {
  httpMethod?: string;
  path?: string;
  pathParameters?: Record<string, string | undefined> | null;
  queryStringParameters?: Record<string, string | undefined> | null;
};

type LambdaResponse = {
  body: string;
  headers: Record<string, string>;
  statusCode: number;
};

type OrderListResponse = {
  orders: Order[];
  total: number;
};

type OrderDetailResponse = {
  order: Order;
};

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

function response(statusCode: number, body: unknown): LambdaResponse {
  return {
    body: JSON.stringify(body),
    headers: jsonHeaders,
    statusCode,
  };
}

function isOrderCollectionPath(path?: string) {
  // `/api/orders` と `/orders` を同じ一覧ルートとして扱う。
  return path === "/orders" || path === "/api/orders" || path === "/";
}

function readOrderId(event: ApiGatewayEvent) {
  const pathId = event.pathParameters?.id;

  if (pathId) {
    return pathId;
  }

  const path = event.path ?? "";
  const segments = path.split("/").filter(Boolean);

  return segments.at(-1);
}

function normalizeFilter(value?: string) {
  if (!value || value === "all") {
    return null;
  }

  return value;
}

export async function handler(event: ApiGatewayEvent): Promise<LambdaResponse> {
  if ((event.httpMethod ?? "GET") !== "GET") {
    // 学習用ハンドラでは GET 以外は返さない。
    return response(405, {
      error: "Method Not Allowed",
    });
  }

  if (isOrderCollectionPath(event.path)) {
    const query = event.queryStringParameters ?? {};
    const orders = await searchOrders({
      paymentMethod: normalizeFilter(query.paymentMethod) as PaymentMethod | null,
      query: query.query ?? null,
      status: normalizeFilter(query.status) as OrderStatus | null,
    });

    return response(200, {
      orders,
      total: orders.length,
    } satisfies OrderListResponse);
  }

  const orderId = readOrderId(event);

  if (!orderId) {
    return response(400, {
      error: "Order id is required",
    });
  }

  const order = await getOrderById(orderId);

  if (!order) {
    return response(404, {
      error: "Order not found",
    });
  }

  return response(200, {
    order,
  } satisfies OrderDetailResponse);
}
