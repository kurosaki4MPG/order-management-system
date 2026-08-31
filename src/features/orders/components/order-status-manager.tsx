"use client";

import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { ApiError } from "@/features/orders/api/order-api";
import { useUpdateOrderStatusMutation } from "@/features/orders/api/order-queries";
import {
  OrderStatusBadge,
  getOrderStatusLabel,
} from "@/features/orders/components/order-status-badge";
import type { OrderStatus } from "@/features/orders/types/order";
import { orderStatuses } from "@/features/orders/types/order";
import { Button } from "@/components/ui/button";

// ステータス更新は、現在値・変更候補・履歴をまとめた小さな操作パネルにする。
type OrderStatusManagerProps = {
  initialStatus: OrderStatus;
  orderId: string;
  readOnly?: boolean;
};

type StatusHistoryItem = {
  changedAt: string;
  status: OrderStatus;
};

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function OrderStatusManager({
  initialStatus,
  orderId,
  readOnly = false,
}: OrderStatusManagerProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<OrderStatus>(initialStatus);
  const [currentStatus, setCurrentStatus] =
    useState<OrderStatus>(initialStatus);
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const updateStatusMutation = useUpdateOrderStatusMutation(orderId);

  const hasChange = selectedStatus !== currentStatus;

  const statusOptions = useMemo(
    () =>
      orderStatuses.map((status) => ({
        label: getOrderStatusLabel(status),
        value: status,
      })),
    []
  );

  async function applyStatus() {
    // 変更がないなら送信しない。
    if (!hasChange) {
      return;
    }

    setIsUpdating(true);
    setErrorMessage("");

    try {
      const order = await updateStatusMutation.mutateAsync(selectedStatus);

      setCurrentStatus(order.status);
      setSelectedStatus(order.status);
      setHistory((currentHistory) => [
        {
          changedAt: new Date().toISOString(),
          status: order.status,
        },
        ...currentHistory,
      ]);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError && error.message
          ? error.message
          : "ステータス更新に失敗しました。時間をおいて再実行してください。"
      );
    } finally {
      setIsUpdating(false);
    }
  }

  function resetStatus() {
    // 元のステータスに戻して、未保存変更を解消する。
    setSelectedStatus(currentStatus);
  }

  return (
    <div className="space-y-4">
      {readOnly ? (
        <div className="border border-muted-foreground/20 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          閲覧専用のためステータスは変更できません。
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">
            現在のステータス
          </p>
          <div className="mt-2">
            <OrderStatusBadge status={currentStatus} />
          </div>
        </div>
        {history.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {history.length} 回更新
          </p>
        )}
      </div>

      {!readOnly && (
        <>
          <label className="block">
            <span className="text-sm font-semibold">変更後ステータス</span>
            <select
              aria-label="変更後ステータス"
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(event.target.value as OrderStatus)
              }
              className="mt-1 h-10 w-full border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              className="gap-2"
              onClick={applyStatus}
              disabled={!hasChange || isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              更新
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={resetStatus}
              disabled={!hasChange || isUpdating}
            >
              <RotateCcw className="size-4" />
              戻す
            </Button>
          </div>
        </>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2 border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground">
            更新履歴
          </p>
          <ol className="mt-2 space-y-2">
            {history.map((item) => (
              <li
                key={`${item.changedAt}-${item.status}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <OrderStatusBadge status={item.status} />
                <span className="text-xs text-muted-foreground">
                  {timeFormatter.format(new Date(item.changedAt))}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
