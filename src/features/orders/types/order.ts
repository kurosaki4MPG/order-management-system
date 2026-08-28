// 注文ドメインで使う状態と支払い方法を、アプリ全体で共通の型として定義する。
export const orderStatuses = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "canceled",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const paymentMethods = [
  "credit-card",
  "bank-transfer",
  "cash-on-delivery",
] as const;

export type PaymentMethod = (typeof paymentMethods)[number];

export type OrderItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  orderedAt: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  totalAmount: number;
};
