// 学習段階の注文登録ハンドラ。API Gateway の POST を受けて注文を組み立てる最小実装。
import { orderFormSchema } from "@/features/orders/schemas/order-schema";
import type { Order } from "@/features/orders/types/order";
import { logInfo } from "@/lib/logging.server";

type ApiGatewayEvent = {
  body?: string | null;
  headers?: Record<string, string | undefined>;
  httpMethod?: string;
  path?: string;
};

type LambdaResponse = {
  body: string;
  headers: Record<string, string>;
  statusCode: number;
};

type ErrorResponse = {
  error: string;
  issues?: Record<string, string[]>;
};

type CreatedOrderResponse = {
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

function buildOrderId() {
  // 日時ベースの見やすい ID を作り、ログから追跡しやすくする。
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  const timePart = date.toISOString().slice(11, 19).replaceAll(":", "");
  const randomPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `ORD-${datePart}-${timePart}-${randomPart}`;
}

function calculateTotalAmount(items: Order["items"]) {
  // 合計金額はサーバー側で再計算し、クライアント値を信用しない。
  return items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
}

function extractRequestId(headers?: Record<string, string | undefined>) {
  return headers?.["x-request-id"] ?? headers?.["X-Request-Id"];
}

export async function handler(event: ApiGatewayEvent): Promise<LambdaResponse> {
  if ((event.httpMethod ?? "POST") !== "POST") {
    return response(405, {
      error: "Method Not Allowed",
    } satisfies ErrorResponse);
  }

  const parsed = orderFormSchema.safeParse(parseBody(event.body));

  if (!parsed.success) {
    return response(400, {
      error: "Invalid order",
      issues: parsed.error.flatten().fieldErrors,
    } satisfies ErrorResponse);
  }

  const orderedAt = new Date().toISOString();
  const totalAmount = calculateTotalAmount(parsed.data.items);
  const order: Order = {
    id: buildOrderId(),
    orderedAt,
    customerName: parsed.data.customerName,
    customerEmail: parsed.data.customerEmail,
    shippingAddress: parsed.data.shippingAddress,
    status: "pending",
    paymentMethod: parsed.data.paymentMethod,
    items: parsed.data.items,
    totalAmount,
  };

  logInfo("Order draft created", {
    orderId: order.id,
    requestId: extractRequestId(event.headers),
  });

  return response(201, {
    order,
    requestId: extractRequestId(event.headers),
  } satisfies CreatedOrderResponse & { requestId?: string });
}
