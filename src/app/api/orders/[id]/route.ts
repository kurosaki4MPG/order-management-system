import {
  getAuthSession,
} from "@/features/auth/cognito-auth.server";
import {
  canDeleteOrders,
  createAuthorizationResponse,
} from "@/features/auth/authorization.server";
import { assertSameOriginRequest } from "@/lib/api-security.server";
import {
  deleteOrder,
  getOrderById,
} from "@/features/orders/services/order-service";

// 注文詳細取得と削除を同じルートセグメントにまとめる。
type OrderRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: OrderRouteContext) {
  const session = await getAuthSession();
  if (!session) {
    return createAuthorizationResponse("Authentication required", 401);
  }

  // 詳細は存在確認込みで返し、見つからない場合は 404 にする。
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
    order,
  });
}

export async function DELETE(_request: Request, { params }: OrderRouteContext) {
  const originError = assertSameOriginRequest(_request, "Order deletion");
  if (originError) {
    return originError;
  }

  const session = await getAuthSession();
  if (!session) {
    return createAuthorizationResponse("Authentication required", 401);
  }

  if (!canDeleteOrders(session)) {
    return createAuthorizationResponse("Admin role required");
  }

  // 削除は成否だけを返し、UI 側は削除結果で遷移する。
  const { id } = await params;
  const deleted = await deleteOrder(id);

  if (!deleted) {
    return Response.json(
      {
        error: "Order not found",
      },
      { status: 404 }
    );
  }

  return Response.json({
    deleted: true,
    orderId: id,
  });
}
