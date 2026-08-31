import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAuthSession } from "@/features/auth/cognito-auth.server"

export const metadata = {
  title: "ログイン",
}

export default async function LoginPage() {
  const session = await getAuthSession()
  if (session) {
    redirect("/")
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>ログイン</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Cognito のホスト型 UI を使って注文管理システムにサインインします。
          </p>
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href="/api/auth/login?returnTo=/" />}
          >
            Cognito でログイン
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
