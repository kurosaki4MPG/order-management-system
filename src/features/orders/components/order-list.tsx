"use client";

import { Eye, Loader2, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import {
  useDeleteOrderMutation,
  useOrdersQuery,
} from "@/features/orders/api/order-queries";
import {
  OrderStatusBadge,
  getOrderStatusLabel,
} from "@/features/orders/components/order-status-badge";
import type {
  Order,
  OrderStatus,
  PaymentMethod,
} from "@/features/orders/types/order";
import { orderStatuses, paymentMethods } from "@/features/orders/types/order";
import {
  currencyFormatter,
  paymentMethodLabels,
  shortDateTimeFormatter,
} from "@/features/orders/utils/order-formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// 注文一覧は、検索・絞り込み・削除を同じテーブルで扱う中心画面。
type StatusFilter = "all" | OrderStatus;
type PaymentFilter = "all" | PaymentMethod;

type OrderListProps = {
  initialOrders: Order[];
  canDeleteOrder?: boolean;
};

export function OrderList({
  canDeleteOrder = true,
  initialOrders,
}: OrderListProps) {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const deferredSearchText = useDeferredValue(searchText);
  const queryFilters = useMemo(
    () => ({
      paymentMethod: paymentFilter,
      query: deferredSearchText,
      status: statusFilter,
    }),
    [deferredSearchText, paymentFilter, statusFilter]
  );
  const hasActiveFilters =
    searchText !== "" || statusFilter !== "all" || paymentFilter !== "all";
  const { data, isError, isFetching, isLoading } = useOrdersQuery(
    queryFilters,
    hasActiveFilters ? undefined : { orders: initialOrders, total: initialOrders.length }
  );
  const deleteOrderMutation = useDeleteOrderMutation();

  const orders = data?.orders ?? initialOrders;
  const total = data?.total ?? orders.length;

  const summary = useMemo(
    () =>
      orderStatuses.map((status) => ({
        status,
        label: getOrderStatusLabel(status),
        count: orders.filter((order) => order.status === status).length,
      })),
    [orders]
  );

  function resetFilters() {
    // フィルタ状態を初期化して、一覧全体を見直せるようにする。
    setSearchText("");
    setStatusFilter("all");
    setPaymentFilter("all");
  }

  async function handleDeleteOrder(order: Order) {
    // 実行前に確認し、一覧上の削除は意図した操作だけに限定する。
    const confirmed = window.confirm(
      `${order.id} を削除します。DynamoDB上の注文も削除されます。`
    );

    if (!confirmed) {
      return;
    }

    setDeletingOrderId(order.id);

    try {
      await deleteOrderMutation.mutateAsync(order.id);
    } finally {
      setDeletingOrderId(null);
    }
  }

  if (isError && !orders.length) {
    return (
      <div className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        注文一覧の取得に失敗しました。ページを再読み込みしてください。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="注文ステータス集計">
        {summary.map((item) => (
          <button
            key={item.status}
            type="button"
            onClick={() => setStatusFilter(item.status)}
            className={cn(
              "border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-muted",
              statusFilter === item.status && "border-primary bg-muted"
            )}
          >
            <p className="text-xs font-semibold text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-2xl font-bold">{item.count}</p>
          </button>
        ))}
      </section>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>注文一覧</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SlidersHorizontal className="size-4" />
              {isFetching
                ? "同期中..."
                : hasActiveFilters
                  ? `${total} 件の検索結果`
                  : `${total} 件`}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isError && orders.length > 0 && (
            <div className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              一覧の再取得に失敗しました。前回の結果を表示しています。
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
            <label className="relative block">
              <span className="sr-only">注文を検索</span>
              <Search className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className="pl-6"
                placeholder="注文番号、顧客名、商品名で検索"
              />
            </label>

            <label className="block">
              <span className="sr-only">ステータス</span>
              <select
                aria-label="ステータス"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="h-10 w-full border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <option value="all">すべてのステータス</option>
                {orderStatuses.map((status) => (
                  <option key={status} value={status}>
                    {getOrderStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="sr-only">支払い方法</span>
              <select
                aria-label="支払い方法"
                value={paymentFilter}
                onChange={(event) =>
                  setPaymentFilter(event.target.value as PaymentFilter)
                }
                className="h-10 w-full border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <option value="all">すべての支払い方法</option>
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {paymentMethodLabels[method]}
                  </option>
                ))}
              </select>
            </label>

            <Button
              variant="outline"
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="gap-2"
            >
              <X className="size-4" />
              解除
            </Button>
          </div>

          <div className="overflow-x-auto border">
            {isLoading ? (
              <OrderListSkeleton />
            ) : (
              <>
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead className="bg-muted/70 text-left text-xs font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">注文番号</th>
                      <th className="px-4 py-3">注文日時</th>
                      <th className="px-4 py-3">顧客</th>
                      <th className="px-4 py-3">商品</th>
                      <th className="px-4 py-3">支払い</th>
                      <th className="px-4 py-3">ステータス</th>
                      <th className="px-4 py-3 text-right">合計</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t bg-card">
                        <td className="px-4 py-4 font-medium">{order.id}</td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {shortDateTimeFormatter.format(new Date(order.orderedAt))}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-xs text-muted-foreground">
                            {order.customerEmail}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium">
                            {order.items[0]?.productName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.items.length} 商品 / 合計{" "}
                            {order.items.reduce(
                              (total, item) => total + item.quantity,
                              0
                            )}
                            点
                          </div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {paymentMethodLabels[order.paymentMethod]}
                        </td>
                        <td className="px-4 py-4">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-4 text-right font-semibold">
                          {currencyFormatter.format(order.totalAmount)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/orders/${order.id}`}
                              className="inline-flex h-9 items-center justify-center gap-2 border border-input px-3 text-xs font-semibold transition-colors hover:bg-muted"
                            >
                              <Eye className="size-4" />
                              詳細
                            </Link>
                            {canDeleteOrder && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={`${order.id} を削除`}
                                disabled={deletingOrderId === order.id}
                                onClick={() => void handleDeleteOrder(order)}
                              >
                                {deletingOrderId === order.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {orders.length === 0 && (
                  <div className="border-t bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                    条件に一致する注文はありません。
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrderListSkeleton() {
  return (
    <div className="min-w-[980px]">
      <div className="border-b bg-muted/70 px-4 py-3 text-xs font-semibold text-muted-foreground">
        注文一覧
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[120px_180px_1fr_120px_100px_120px_120px_100px] gap-3">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-9" />
          </div>
        ))}
      </div>
    </div>
  );
}
