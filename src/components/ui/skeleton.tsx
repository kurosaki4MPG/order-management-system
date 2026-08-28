// 読み込み中のプレースホルダーを、最小の実装で再利用できるようにする。
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
