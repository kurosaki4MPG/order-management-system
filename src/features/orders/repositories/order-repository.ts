import type { OrderFormValues } from "@/features/orders/schemas/order-schema";
import type { Order, OrderStatus, PaymentMethod } from "@/features/orders/types/order";

// Service 層が依存する最小インターフェースだけを公開し、具象実装を隠す。
type MaybePromise<T> = Promise<T> | T;

export type OrderQueryFilters = {
  paymentMethod?: PaymentMethod | null;
  query?: string | null;
  status?: OrderStatus | null;
};

export interface OrderRepository {
  create(values: OrderFormValues): MaybePromise<Order>;
  delete(id: string): MaybePromise<boolean>;
  getById(id: string): MaybePromise<Order | undefined>;
  list(filters?: OrderQueryFilters): MaybePromise<Order[]>;
  update(id: string, values: OrderFormValues): MaybePromise<Order | undefined>;
  updateStatus(id: string, status: OrderStatus): MaybePromise<Order | undefined>;
}
