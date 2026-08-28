import type { PaymentMethod } from "@/features/orders/types/order";

// 表示用ラベルと日時/金額フォーマットをまとめ、UI での重複を減らす。
export const paymentMethodLabels: Record<PaymentMethod, string> = {
  "credit-card": "クレジットカード",
  "bank-transfer": "銀行振込",
  "cash-on-delivery": "代金引換",
};

export const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const shortDateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
});
