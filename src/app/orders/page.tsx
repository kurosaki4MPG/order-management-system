import type { Metadata } from "next";

import { OrderList } from "@/features/orders/components/order-list";
import { getOrders } from "@/features/orders/services/order-service";

// 注文一覧は DynamoDB から毎回取得するため、ビルド時の静的生成を避ける。
export const dynamic = "force-dynamic";

// 注文一覧はサーバー取得結果を初期値として渡し、画面側で検索・絞り込みを行う。
export const metadata: Metadata = {
  title: "注文一覧",
};

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">注文一覧</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          注文状況の確認、検索、絞り込みができます。
        </p>
      </div>

      <OrderList initialOrders={orders} />
    </div>
  );
}
