import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAuthSession } from "@/features/auth/cognito-auth.server"
import { canCreateOrders } from "@/features/auth/authorization.server"
import { OrderForm } from "@/features/orders/components/order-form"

export const metadata: Metadata = {
  title: "注文登録",
}

export default async function NewOrderPage() {
  const session = await getAuthSession()
  if (!session) {
    redirect("/login")
  }

  if (!canCreateOrders(session)) {
    redirect("/forbidden")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">注文登録</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          顧客情報と注文商品を入力して、新しい注文を登録します。
        </p>
      </div>

      <OrderForm />
    </div>
  )
}
