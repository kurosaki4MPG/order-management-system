import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthSession } from "@/features/auth/cognito-auth.server";
import {
  canDeleteOrders,
  canUpdateOrderStatus,
} from "@/features/auth/authorization.server";
import { OrderDetail } from "@/features/orders/components/order-detail";

type OrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// 詳細ページは ID を受け取り、注文詳細コンポーネントに渡すだけにする。
export async function generateMetadata({
  params,
}: OrderDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: id,
    description: `${id} の注文詳細`,
  };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <OrderDetail
      orderId={id}
      canDeleteOrder={canDeleteOrders(session)}
      canUpdateStatus={canUpdateOrderStatus(session)}
    />
  );
}
