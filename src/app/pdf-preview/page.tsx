import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import PdfPreviewPanel from "@/features/pdf/pdf-preview-panel"

export default function PdfPreviewPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          注文連携 PDF プレビュー
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          注文データをそのまま請求書 PDF に反映します。
        </p>
      </div>

      <section className="grid gap-4">
        <PdfPreviewPanel />
      </section>
    </div>
  )
}
