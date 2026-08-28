import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import PdfPreviewPanel from "@/features/pdf/pdf-preview-panel"

export default function PdfPreviewPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          Phase 5 / STEP39
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          注文連携 PDF プレビュー
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          注文一覧から対象を選び、その注文データをそのまま請求書 PDF に反映します。
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <PdfPreviewPanel />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">出力確認</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                <code className="rounded bg-muted px-1 py-0.5">/api/pdf/invoice</code>
                は選択した注文 ID を受け取り、実データから請求書を生成します。
              </p>
              <p>更新ボタンで再取得し、保存と共有の動作も同じ注文で確認できます。</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">STEP40 の確認観点</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. 注文情報が請求書の項目に反映されている</p>
              <p>2. 明細と合計が見やすく整理されている</p>
              <p>3. サーバー生成版として安定して表示できる</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">サーバー生成確認</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>プレビューで選んだ注文と同じ内容を、生成 API で直接確認できます。</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">S3 保存と共有</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <code className="rounded bg-muted px-1 py-0.5">PDF_INVOICE_BUCKET_NAME</code>
                を設定すると、同じ注文の請求書を S3 に保存し、署名付き URL を発行できます。
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
