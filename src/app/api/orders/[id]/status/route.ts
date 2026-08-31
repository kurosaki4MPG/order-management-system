import { getAuthSession } from "@/features/auth/cognito-auth.server";
import {
  canUpdateOrderStatus,
  createAuthorizationResponse,
} from "@/features/auth/authorization.server";
import {
  assertJsonRequest,
  assertSameOriginRequest,
} from "@/lib/api-security.server";
import { updateOrderStatusSchema } from "@/features/orders/schemas/order-schema";
import {
  getOrderById,
  updateOrderStatus,
} from "@/features/orders/services/order-service";

// ステータス更新は注文の詳細更新から分離して、画面上の操作を簡潔にする。
type OrderStatusRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: OrderStatusRouteContext
) {
  const originError = assertSameOriginRequest(request, "Order status update");
  if (originError) {
    return originError;
  }

  const session = await getAuthSession();
  if (!session) {
    return createAuthorizationResponse("Authentication required", 401);
  }

  if (!canUpdateOrderStatus(session)) {
    return createAuthorizationResponse("Operator or admin role required");
  }

  const contentTypeError = assertJsonRequest(request, "Order status update");
  if (contentTypeError) {
    return contentTypeError;
  }

  // body は status のみを受け取り、専用スキーマで検証する。
  const { id } = await params;
  const body: unknown = await request.json();
  const result = updateOrderStatusSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: "Invalid order status",
        issues: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const order = await updateOrderStatus(id, result.data.status);

  if (!order) {
    return Response.json(
      {
        error: "Order not found",
      },
      { status: 404 }
    );
  }

  return Response.json({
    order,
  });
}

export async function GET(
  _request: Request,
  { params }: OrderStatusRouteContext
) {
  const session = await getAuthSession();
  if (!session) {
    return createAuthorizationResponse("Authentication required", 401);
  }

  // ステータス確認だけを必要とする画面向けに、軽いレスポンスを返す。
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return Response.json(
      {
        error: "Order not found",
      },
      { status: 404 }
    );
  }

  return Response.json({
    status: order.status,
  });
}
