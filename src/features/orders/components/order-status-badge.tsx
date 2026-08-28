import type { OrderStatus } from "@/features/orders/types/order";
import { cn } from "@/lib/utils";

// ステータスごとの見た目を固定し、画面全体で同じ意味を同じ色で扱う。
const statusConfig: Record<
  OrderStatus,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "処理待ち",
    className: "border-amber-300 bg-amber-50 text-amber-700",
  },
  processing: {
    label: "処理中",
    className: "border-sky-300 bg-sky-50 text-sky-700",
  },
  shipped: {
    label: "発送済み",
    className: "border-indigo-300 bg-indigo-50 text-indigo-700",
  },
  delivered: {
    label: "完了",
    className: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
  canceled: {
    label: "キャンセル",
    className: "border-zinc-300 bg-zinc-50 text-zinc-600",
  },
};

type OrderStatusBadgeProps = {
  status: OrderStatus;
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-20 items-center justify-center border px-2 text-xs font-semibold",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

export function getOrderStatusLabel(status: OrderStatus) {
  return statusConfig[status].label;
}
