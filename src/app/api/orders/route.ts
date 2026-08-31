import type { NextRequest } from "next/server";

import { getAuthSession } from "@/features/auth/cognito-auth.server";
import {
  canCreateOrders,
  createAuthorizationResponse,
} from "@/features/auth/authorization.server";
import { assertJsonRequest, assertSameOriginRequest } from "@/lib/api-security.server";
import { orderFormSchema } from "@/features/orders/schemas/order-schema";
import {
  createOrder,
  searchOrders,
} from "@/features/orders/services/order-service";
import {
  orderStatuses,
  paymentMethods,
} from "@/features/orders/types/order";

// 注文一覧と作成のエンドポイントを、Next.js の Route Handler として公開する。
function parseStatus(value: string | null) {
  if (!value || value === "all") {
    return null;
  }

  return orderStatuses.includes(value as (typeof orderStatuses)[number])
    ? (value as (typeof orderStatuses)[number])
    : null;
}

function parsePaymentMethod(value: string | null) {
  if (!value || value === "all") {
    return null;
  }

  return paymentMethods.includes(value as (typeof paymentMethods)[number])
    ? (value as (typeof paymentMethods)[number])
    : null;
}

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return createAuthorizationResponse("Authentication required", 401);
  }

  // 検索条件はクエリ文字列から受け取り、Service に渡せる形へ整える。
  const query = request.nextUrl.searchParams.get("query");
  const status = request.nextUrl.searchParams.get("status");
  const paymentMethod = request.nextUrl.searchParams.get("paymentMethod");
  const orders = await searchOrders({
    paymentMethod: parsePaymentMethod(paymentMethod),
    query,
    status: parseStatus(status),
  });

  return Response.json({
    orders,
    total: orders.length,
  });
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return createAuthorizationResponse("Authentication required", 401);
  }

  if (!canCreateOrders(session)) {
    return createAuthorizationResponse("Operator or admin role required");
  }

  const originError = assertSameOriginRequest(request, "Order creation");
  if (originError) {
    return originError;
  }

  const contentTypeError = assertJsonRequest(request, "Order creation");
  if (contentTypeError) {
    return contentTypeError;
  }

  // 入力検証は Zod に任せ、業務ロジックに入る前に不正値を弾く。
  const body: unknown = await request.json();
  const result = orderFormSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: "Invalid order",
        issues: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const order = await createOrder(result.data);

  return Response.json(
    {
      order,
    },
    { status: 201 }
  );
}
