import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "注文一覧",
};

export default function OrdersPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">注文一覧</h1>
      <p className="text-sm text-muted-foreground">
        次のステップで注文テーブルを実装します。
      </p>
    </div>
  );
}
