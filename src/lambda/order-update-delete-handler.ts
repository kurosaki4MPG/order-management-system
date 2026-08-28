// 学習段階の更新/削除ハンドラ。PATCH と DELETE を 1 本にまとめて動作確認しやすくしている。
import {
  orderFormSchema,
  updateOrderStatusSchema,
} from "@/features/orders/schemas/order-schema";
import {
  deleteOrder,
  getOrderById,
  updateOrder,
  updateOrderStatus,
} from "@/features/orders/services/order-service";
import type { Order } from "@/features/orders/types/order";

type ApiGatewayEvent = {
  body?: string | null;
  httpMethod?: string;
  path?: string;
  pathParameters?: Record<string, string | undefined> | null;
};

type LambdaResponse = {
  body: string;
  headers: Record<string, string>;
  statusCode: number;
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

function readOrderId(event: ApiGatewayEvent) {
  const pathId = event.pathParameters?.id;

  if (pathId) {
    return pathId;
  }

  const path = event.path ?? "";
  const segments = path.split("/").filter(Boolean);

  return segments.at(-1);
}

function isStatusUpdatePayload(body: unknown) {
  // status だけの PATCH はステータス変更、それ以外は注文更新として扱う。
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return false;
  }

  const keys = Object.keys(body);

  return keys.length === 1 && keys[0] === "status";
}

async function buildUpdatedOrder(
  orderId: string,
  body: unknown
): Promise<Order | undefined> {
  // body の形で処理を分岐し、ステータス更新と詳細更新を同じ入口で扱う。
  if (isStatusUpdatePayload(body)) {
    const result = updateOrderStatusSchema.safeParse(body);

    if (!result.success) {
      return undefined;
    }

    return updateOrderStatus(orderId, result.data.status);
  }

  const result = orderFormSchema.safeParse(body);

  if (!result.success) {
    return undefined;
  }

  return updateOrder(orderId, result.data);
}

export async function handler(event: ApiGatewayEvent): Promise<LambdaResponse> {
  // PATCH/DELETE 以外は明示的に拒否する。
  const method = event.httpMethod ?? "PATCH";
  const orderId = readOrderId(event);

  if (!orderId) {
    return response(400, {
      error: "Order id is required",
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

    const updatedOrder = await buildUpdatedOrder(orderId, body);

    if (!updatedOrder) {
      return response(400, {
        error: "Invalid order payload",
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

    return response(200, {
      deleted: true,
      orderId,
    });
  }

  return response(405, {
    error: "Method Not Allowed",
    allowedMethods: ["PATCH", "DELETE"],
  });
}
