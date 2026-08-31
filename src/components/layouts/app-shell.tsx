import type { ReactNode } from "react";

import { AppHeader } from "@/components/layouts/app-header";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { QueryProvider } from "@/components/providers/query-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAuthSession } from "@/features/auth/cognito-auth.server";

type AppShellProps = {
  children: ReactNode;
};

export default async function AppShell({ children }: AppShellProps) {
  // Provider とレイアウト骨格をここでまとめ、各ページの重複をなくす。
  const session = await getAuthSession();

  return (
    <QueryProvider>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <AppHeader session={session} />
            <div className="flex-1 bg-muted/30">
              <div className="mx-auto w-full max-w-screen-2xl p-4 md:p-6">
                {children}
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </QueryProvider>
  );
}
