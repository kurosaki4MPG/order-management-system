import type { ReactNode } from "react";

import { AppHeader } from "@/components/layouts/app-header";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div className="flex-1 bg-muted/30">
            <div className="mx-auto w-full max-w-screen-2xl p-4 md:p-6">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
