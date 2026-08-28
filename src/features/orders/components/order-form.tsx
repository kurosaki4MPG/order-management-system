"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { ApiError } from "@/features/orders/api/order-api";
import { useCreateOrderMutation } from "@/features/orders/api/order-queries";
import {
  orderFormSchema,
  type OrderFormValues,
} from "@/features/orders/schemas/order-schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// 注文登録フォームは、検証・合計計算・送信結果表示を 1 つにまとめる。
const paymentMethodOptions = [
  { value: "credit-card", label: "クレジットカード" },
  { value: "bank-transfer", label: "銀行振込" },
  { value: "cash-on-delivery", label: "代金引換" },
] as const;

const defaultValues: OrderFormValues = {
  customerName: "",
  customerEmail: "",
  shippingAddress: "",
  paymentMethod: "credit-card",
  note: "",
  items: [
    {
      productName: "",
      quantity: 1,
      unitPrice: 1000,
    },
  ],
};

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
});

export function OrderForm() {
  const [submittedOrder, setSubmittedOrder] = useState<{
    orderId: string;
    totalAmount: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const createOrderMutation = useCreateOrderMutation();

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues,
    mode: "onBlur",
  });

  const { append, fields, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = useWatch({
    control,
    name: "items",
  });
  const totalAmount = useMemo(
    () =>
      watchedItems.reduce((total, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;

        return total + quantity * unitPrice;
      }, 0),
    [watchedItems]
  );

  async function onSubmit(values: OrderFormValues) {
    // 送信失敗時は入力エラーとシステムエラーを分けて見せる。
    setErrorMessage("");

    try {
      const order = await createOrderMutation.mutateAsync(values);

      setSubmittedOrder({
        orderId: order.id,
        totalAmount: order.totalAmount,
      });
      reset(defaultValues);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        // API が返した入力不備は、最初のメッセージだけを画面に出す。
        const firstIssue = Object.values(error.body?.issues ?? {})
          .flat()
          .find(Boolean);

        setErrorMessage(
          firstIssue ?? "入力内容に不備があります。修正して再実行してください。"
        );
        return;
      }

      setErrorMessage(
        "注文登録に失敗しました。入力内容を確認して再実行してください。"
      );
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      {submittedOrder && (
        <div
          className="flex items-start gap-3 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">注文を登録しました。</p>
            <p>
              {submittedOrder.orderId} / 合計{" "}
              {currencyFormatter.format(submittedOrder.totalAmount)}
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-3 border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>顧客情報</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="顧客名" error={errors.customerName?.message}>
            <Input
              {...register("customerName")}
              autoComplete="name"
              placeholder="例: 佐藤 健一"
            />
          </Field>

          <Field label="メールアドレス" error={errors.customerEmail?.message}>
            <Input
              {...register("customerEmail")}
              type="email"
              autoComplete="email"
              placeholder="例: sato@example.com"
            />
          </Field>

          <Field
            label="配送先住所"
            error={errors.shippingAddress?.message}
            className="md:col-span-2"
          >
            <Input
              {...register("shippingAddress")}
              autoComplete="street-address"
              placeholder="例: 東京都渋谷区神南1-1-1"
            />
          </Field>

          <Field label="支払い方法" error={errors.paymentMethod?.message}>
            <select
              {...register("paymentMethod")}
              className="h-10 w-full border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="備考" error={errors.note?.message}>
            <Input
              {...register("note")}
              placeholder="任意入力"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>注文商品</CardTitle>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() =>
                append({
                  productName: "",
                  quantity: 1,
                  unitPrice: 1000,
                })
              }
            >
              <Plus className="size-4" />
              商品を追加
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 border p-3 md:grid-cols-[minmax(180px,1fr)_120px_140px_auto]"
            >
              <Field
                label="商品名"
                error={errors.items?.[index]?.productName?.message}
              >
                <Input
                  {...register(`items.${index}.productName`)}
                  placeholder="例: ノートPCスタンド"
                />
              </Field>

              <Field label="数量" error={errors.items?.[index]?.quantity?.message}>
                <Input
                  {...register(`items.${index}.quantity`, {
                    valueAsNumber: true,
                  })}
                  type="number"
                  min={1}
                />
              </Field>

              <Field label="単価" error={errors.items?.[index]?.unitPrice?.message}>
                <Input
                  {...register(`items.${index}.unitPrice`, {
                    valueAsNumber: true,
                  })}
                  type="number"
                  min={1}
                />
              </Field>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="商品を削除"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}

          {errors.items?.root?.message && (
            <p className="text-sm text-destructive">{errors.items.root.message}</p>
          )}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              商品行の数量と単価から合計金額を自動計算します。
            </p>
            <div className="text-right">
              <p className="text-xs font-semibold text-muted-foreground">
                注文合計
              </p>
              <p className="text-2xl font-bold">
                {currencyFormatter.format(totalAmount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" className="gap-2" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          注文を登録
        </Button>
      </div>
    </form>
  );
}

type FieldProps = {
  children: React.ReactNode;
  className?: string;
  error?: string;
  label: string;
};

function Field({ children, className, error, label }: FieldProps) {
  // ラベル・入力欄・エラーを毎回同じ形で並べるための補助コンポーネント。
  return (
    <label className={className}>
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </label>
  );
}
