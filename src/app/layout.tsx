import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import AppShell from "@/components/layouts/app-shell";

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
    <html lang="ja" className={cn("oms h-full", "antialiased", "font-sans")}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;700&family=Inter:wght@400;500;700&family=JetBrains+Mono:wght@400;700&family=M+PLUS+1+Code:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
