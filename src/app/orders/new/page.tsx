import type { Metadata } from "next";

import { OrderForm } from "@/features/orders/components/order-form";

// 注文登録画面はフォームの責務だけを持ち、入力と送信に集中する。
export const metadata: Metadata = {
  title: "注文登録",
};

export default function NewOrderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">注文登録</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          顧客情報と注文商品を入力して、新しい注文を登録します。
        </p>
      </div>

      <OrderForm />
    </div>
  );
}
