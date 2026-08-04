import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "注文登録",
};

export default function NewOrderPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">注文登録</h1>
      <p className="text-sm text-muted-foreground">
        後続のステップで入力フォームを実装します。
      </p>
    </div>
  );
}
