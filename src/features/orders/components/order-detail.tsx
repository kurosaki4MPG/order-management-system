"use client";

import {
  ArrowLeft,
  Loader2,
  Mail,
  MapPin,
  ReceiptText,
  Trash2,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useDeleteOrderMutation,
  useOrderQuery,
} from "@/features/orders/api/order-queries";
import { OrderStatusManager } from "@/features/orders/components/order-status-manager";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import type { Order } from "@/features/orders/types/order";
import {
  currencyFormatter,
  dateTimeFormatter,
  paymentMethodLabels,
} from "@/features/orders/utils/order-formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// 注文詳細は、商品情報・顧客情報・状態変更を 1 画面にまとめて扱う。
type OrderDetailProps = {
  initialOrder?: Order;
  orderId: string;
  canDeleteOrder?: boolean;
  canUpdateStatus?: boolean;
};

export function OrderDetail({
  canDeleteOrder = true,
  canUpdateStatus = true,
  initialOrder,
  orderId,
}: OrderDetailProps) {
  const router = useRouter();
  const { data: currentOrder, isFetching, isLoading, isError } = useOrderQuery(
    orderId,
    initialOrder
  );
  const deleteOrderMutation = useDeleteOrderMutation();
  const resolvedOrder = currentOrder ?? initialOrder;

  async function handleDeleteOrder() {
    // 削除は確認ダイアログを挟み、誤操作を減らす。
    const confirmed = window.confirm(
      `${orderId} を削除します。DynamoDB上の注文も削除されます。`
    );

    if (!confirmed) {
      return;
    }

    await deleteOrderMutation.mutateAsync(orderId);
    router.push("/orders");
  }

  if (!resolvedOrder && isLoading) {
    // 初回読込はスケルトンで、レイアウトの揺れを避ける。
    return <OrderDetailLoading orderId={orderId} />;
  }

  if (!resolvedOrder) {
    return (
      <div className="space-y-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          注文一覧へ戻る
        </Link>
        <div className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          注文詳細を取得できませんでした。注文ID: {orderId}
        </div>
      </div>
    );
  }

  const itemCount = resolvedOrder.items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return (
    <div className="space-y-6">
      {isError && (
        <div className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          注文詳細の再取得に失敗しました。前回の内容を表示しています。
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            注文一覧へ戻る
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {resolvedOrder.id}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {dateTimeFormatter.format(new Date(resolvedOrder.orderedAt))} に受付
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && (
            <span className="inline-flex h-7 items-center border px-2 text-xs font-semibold text-muted-foreground">
              更新中
            </span>
          )}
          <OrderStatusBadge status={resolvedOrder.status} />
          {canDeleteOrder ? (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={deleteOrderMutation.isPending}
              onClick={() => void handleDeleteOrder()}
            >
              {deleteOrderMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              削除
            </Button>
          ) : (
            <span className="inline-flex h-9 items-center border px-3 text-xs text-muted-foreground">
              閲覧専用
            </span>
          )}
          <div className="text-right">
            <p className="text-xs font-semibold text-muted-foreground">合計</p>
            <p className="text-2xl font-bold">
              {currencyFormatter.format(resolvedOrder.totalAmount)}
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>注文商品</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border">
              {isLoading ? (
                <OrderDetailSkeleton />
              ) : (
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead className="bg-muted/70 text-left text-xs font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">商品名</th>
                      <th className="px-4 py-3 text-right">数量</th>
                      <th className="px-4 py-3 text-right">単価</th>
                      <th className="px-4 py-3 text-right">小計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedOrder.items.map((item) => (
                      <tr key={item.productName} className="border-t bg-card">
                        <td className="px-4 py-4 font-medium">
                          {item.productName}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-4 text-right text-muted-foreground">
                          {currencyFormatter.format(item.unitPrice)}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold">
                          {currencyFormatter.format(item.quantity * item.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <div className="min-w-64 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>商品点数</span>
                  <span>{itemCount} 点</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>合計</span>
                  <span>{currencyFormatter.format(resolvedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>ステータス更新</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderStatusManager
                initialStatus={resolvedOrder.status}
                orderId={resolvedOrder.id}
                readOnly={!canUpdateStatus}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>顧客情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  顧客名
                </p>
                <p className="mt-1 font-medium">{resolvedOrder.customerName}</p>
              </div>
              <div className="flex gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="break-all">{resolvedOrder.customerEmail}</p>
              </div>
              <div className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p>{resolvedOrder.shippingAddress}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>配送・支払い</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex gap-2">
                <Truck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">通常配送</p>
                  <p className="text-xs text-muted-foreground">
                    配送先住所に発送します。
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <ReceiptText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {paymentMethodLabels[resolvedOrder.paymentMethod]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    決済情報は後続ステップで外部決済と連携します。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[1fr_80px_120px_120px] gap-3">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderDetailLoading({ orderId }: { orderId: string }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          注文一覧へ戻る
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{orderId}</h1>
          <p className="mt-1 text-sm text-muted-foreground">注文詳細を取得中</p>
        </div>
      </div>
      <div className="overflow-x-auto border">
        <OrderDetailSkeleton />
      </div>
    </div>
  );
}
