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
