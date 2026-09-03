import { Bell, User } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { AuthSession } from "@/features/auth/cognito-auth.server";
import { getHighestRoleLabel } from "@/features/auth/authorization.server";

// ヘッダーは画面タイトルと操作入口だけに絞り、画面ごとの差分を作らない。
type AppHeaderProps = {
  session: AuthSession | null;
};

export function AppHeader({ session }: AppHeaderProps) {
  const authHref = session ? "/api/auth/logout" : "/login"

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center border-b bg-background/95 px-4 backdrop-blur">
      <div className="flex w-full items-center gap-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">注文管理システム</p>
          <p className="truncate text-xs text-muted-foreground">
            Order Management System
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="通知を表示">
          <Bell className="size-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold">
              {session ? session.displayName : "未ログイン"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {session ? getHighestRoleLabel(session) : "Cognito"}
            </p>
          </div>
          <Button
            nativeButton={false}
            render={session ? <a href={authHref} /> : <Link href={authHref} />}
            variant="outline"
            className="gap-2"
          >
            <User className="size-4" />
            <span className="hidden sm:inline">
              {session ? "ログアウト" : "ログイン"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
