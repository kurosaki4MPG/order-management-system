import { z } from "zod";

// 入力バリデーションは UI ではなくサーバー側のスキーマで一元管理する。
export const orderItemSchema = z.object({
  productName: z.string().min(1, "商品名を入力してください"),
  quantity: z
    .number("数量を入力してください")
    .int("数量は整数で入力してください")
    .min(1, "数量は1以上で入力してください"),
  unitPrice: z
    .number("単価を入力してください")
    .int("単価は整数で入力してください")
    .min(1, "単価は1円以上で入力してください"),
});

export const orderFormSchema = z.object({
  customerName: z.string().min(1, "顧客名を入力してください"),
  customerEmail: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("メールアドレスの形式で入力してください"),
  shippingAddress: z.string().min(1, "配送先住所を入力してください"),
  paymentMethod: z.enum(["credit-card", "bank-transfer", "cash-on-delivery"]),
  note: z.string().max(200, "備考は200文字以内で入力してください").optional(),
  items: z
    .array(orderItemSchema)
    .min(1, "商品を1件以上入力してください"),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "canceled"]),
});

export type UpdateOrderStatusValues = z.infer<typeof updateOrderStatusSchema>;
