import {
  publishOrderCreated,
  publishOrderDeleted,
  publishOrderStatusChanged,
  publishOrderUpdated,
} from "@/features/orders/events/order-event-publisher";
import {
  orderFormSchema,
  updateOrderStatusSchema,
} from "@/features/orders/schemas/order-schema";
import {
  createOrder,
  deleteOrder,
  getOrderById,
  searchOrders,
  updateOrder,
  updateOrderStatus,
} from "@/features/orders/services/order-service";
import type { OrderStatus, PaymentMethod } from "@/features/orders/types/order";

// API Gateway のイベントを受けて、注文 CRUD とステータス変更を 1 本にまとめて処理する。
type ApiGatewayProxyEvent = {
  body?: string | null;
  headers?: Record<string, string | undefined>;
  httpMethod?: string;
  path?: string;
  pathParameters?: Record<string, string | undefined> | null;
  queryStringParameters?: Record<string, string | undefined> | null;
};

type ApiGatewayProxyResult = {
  body: string;
  headers: Record<string, string>;
  isBase64Encoded?: boolean;
  statusCode: number;
};

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Headers": "Content-Type,X-Request-Id",
  "Access-Control-Allow-Methods": "DELETE,GET,OPTIONS,PATCH,POST",
  "Access-Control-Allow-Origin": "*",
};

function response(statusCode: number, body: unknown): ApiGatewayProxyResult {
  return {
    body: JSON.stringify(body),
    headers: jsonHeaders,
    statusCode,
  };
}

function parseBody(body?: string | null) {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return {};
  }
}

function readOrderId(event: ApiGatewayProxyEvent) {
  const pathId = event.pathParameters?.id;

  if (pathId) {
    return pathId;
  }

  const path = event.path ?? "";
  const segments = path.split("/").filter(Boolean);

  return segments.at(-1);
}

function isStatusPayload(body: unknown) {
  return (
    !!body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    Object.keys(body).length === 1 &&
    "status" in body
  );
}

function normalizeFilter(value?: string) {
  if (!value || value === "all") {
    return null;
  }

  return value;
}

function isOrderCollectionPath(path?: string) {
  // 開発用の /api/orders と、本番向けの /orders を同じ扱いにする。
  return path === "/orders" || path === "/api/orders" || path === "/";
}

function isOrderStatusPath(path?: string) {
  return (
    path === "/orders/status" ||
    path === "/api/orders/status" ||
    path?.endsWith("/status") === true
  );
}

function createCorsResponse() {
  return response(200, { ok: true });
}

export async function handler(
  event: ApiGatewayProxyEvent
): Promise<ApiGatewayProxyResult> {
  const method = event.httpMethod ?? "GET";
  const path = event.path ?? "/";

  if (method === "OPTIONS") {
    return createCorsResponse();
  }

  if (method === "GET" && isOrderCollectionPath(path)) {
    const query = event.queryStringParameters ?? {};
    const orders = await searchOrders({
      paymentMethod: normalizeFilter(query.paymentMethod) as PaymentMethod | null,
      query: query.query ?? null,
      status: normalizeFilter(query.status) as OrderStatus | null,
    });

    return response(200, {
      orders,
      total: orders.length,
    });
  }

  if (method === "POST" && isOrderCollectionPath(path)) {
    // 保存を優先し、イベント配信失敗は業務失敗にしない。
    const result = orderFormSchema.safeParse(parseBody(event.body));

    if (!result.success) {
      return response(400, {
        error: "Invalid order",
        issues: result.error.flatten().fieldErrors,
      });
    }

    const order = await createOrder(result.data);

    try {
      await publishOrderCreated(order);
    } catch (error) {
      // 後続イベントはログに残し、注文登録自体は成功で返す。
      console.error("Failed to publish OrderCreated event", {
        error,
        orderId: order.id,
      });
    }

    return response(201, {
      order,
    });
  }

  const orderId = readOrderId(event);

  if (!orderId) {
    return response(400, {
      error: "Order id is required",
    });
  }

  if (method === "GET" && isOrderStatusPath(path)) {
    const order = await getOrderById(orderId);

    if (!order) {
      return response(404, {
        error: "Order not found",
      });
    }

    return response(200, {
      status: order.status,
    });
  }

  if (method === "GET") {
    const order = await getOrderById(orderId);

    if (!order) {
      return response(404, {
        error: "Order not found",
      });
    }

    return response(200, {
      order,
    });
  }

  if (method === "PATCH") {
    const body = parseBody(event.body);
    const currentOrder = await getOrderById(orderId);

    if (!currentOrder) {
      return response(404, {
        error: "Order not found",
      });
    }

    if (isStatusPayload(body)) {
      // PATCH の body が status だけならステータス更新とみなす。
      const statusResult = updateOrderStatusSchema.safeParse(body);

      if (!statusResult.success) {
        return response(400, {
          error: "Invalid order status",
          issues: statusResult.error.flatten().fieldErrors,
        });
      }

      const updatedOrder = await updateOrderStatus(
        orderId,
        statusResult.data.status
      );

      if (!updatedOrder) {
        return response(404, {
          error: "Order not found",
        });
      }

      try {
        await publishOrderStatusChanged(updatedOrder);
      } catch (error) {
        // イベント発行失敗は追跡しつつ、更新結果は返す。
        console.error("Failed to publish OrderStatusChanged event", {
          error,
          orderId,
        });
      }

      return response(200, {
        order: updatedOrder,
      });
    }

    const updateResult = orderFormSchema.safeParse(body);

    if (!updateResult.success) {
      return response(400, {
        error: "Invalid order payload",
        issues: updateResult.error.flatten().fieldErrors,
      });
    }

    const updatedOrder = await updateOrder(orderId, updateResult.data);

    if (!updatedOrder) {
      return response(404, {
        error: "Order not found",
      });
    }

    try {
      await publishOrderUpdated(updatedOrder);
    } catch (error) {
      // 更新後スナップショットの通知失敗は、更新結果の返却と切り離す。
      console.error("Failed to publish OrderUpdated event", {
        error,
        orderId,
      });
    }

    return response(200, {
      order: updatedOrder,
    });
  }

  if (method === "DELETE") {
    const deleted = await deleteOrder(orderId);

    if (!deleted) {
      return response(404, {
        error: "Order not found",
      });
    }

    try {
      await publishOrderDeleted(orderId);
    } catch (error) {
      // 削除イベントも業務本体とは独立して扱う。
      console.error("Failed to publish OrderDeleted event", {
        error,
        orderId,
      });
    }

    return response(200, {
      deleted: true,
      orderId,
    });
  }

  return response(405, {
    error: "Method Not Allowed",
    allowedMethods: ["DELETE", "GET", "OPTIONS", "PATCH", "POST"],
  });
}
