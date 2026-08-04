"use client";

import { Bell, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
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
        <Button variant="outline" className="gap-2">
          <User className="size-4" />
          <span className="hidden sm:inline">管理者</span>
        </Button>
      </div>
    </header>
  );
}
