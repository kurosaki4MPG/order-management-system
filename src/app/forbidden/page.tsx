import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "アクセス権限がありません",
}

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>アクセス権限がありません</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            この操作に必要な権限がありません。管理者または担当者に問い合わせてください。
          </p>
          <Button nativeButton={false} render={<Link href="/" />} className="w-full">
            ダッシュボードへ戻る
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
