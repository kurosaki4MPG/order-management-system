"use client";

import {
  FilePlus2,
  LayoutDashboard,
  PackageSearch,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "ダッシュボード",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "注文一覧",
    href: "/orders",
    icon: PackageSearch,
  },
  {
    title: "注文登録",
    href: "/orders/new",
    icon: FilePlus2,
  },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex size-9 items-center justify-center bg-primary text-primary-foreground">
            <ShoppingCart className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">Order System</p>
            <p className="truncate text-xs text-muted-foreground">
              注文管理システム
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="px-2 py-2 text-xs text-muted-foreground">
          Order System v0.1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
