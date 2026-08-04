import {
  CircleAlert,
  CircleCheck,
  Clock3,
  ShoppingCart,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const summaryItems = [
  {
    title: "本日の注文",
    value: "24",
    description: "前日比 +4件",
    icon: ShoppingCart,
  },
  {
    title: "処理待ち",
    value: "8",
    description: "対応が必要な注文",
    icon: Clock3,
  },
  {
    title: "処理完了",
    value: "15",
    description: "本日完了した注文",
    icon: CircleCheck,
  },
  {
    title: "エラー",
    value: "1",
    description: "確認が必要です",
    icon: CircleAlert,
  },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          注文処理の状況を確認できます。
        </p>
      </div>

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="注文状況"
      >
        {summaryItems.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.title}
              </CardTitle>
              <item.icon className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>最近の注文</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            次のステップで注文一覧を実装します。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
