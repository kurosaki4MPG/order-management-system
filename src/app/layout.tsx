import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layouts/app-shell";

// ルートレイアウトでフォントと共通シェルをまとめ、全ページの見た目の土台を作る。
export const metadata: Metadata = {
  title: {
    default: "注文管理システム",
    template: "%s | 注文管理システム",
  },
  description: "Next.js と AWS サーバーレスで構築する注文管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={cn("h-full", "antialiased", "font-sans")}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
