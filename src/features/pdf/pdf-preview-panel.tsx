"use client"

import { useEffect, useMemo, useState } from "react"
import { FileDown, FileText, RotateCcw } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type PreviewOrder = {
  customerName: string
  id: string
  orderedAt: string
  status: string
  totalAmount: number
}

function buildPreviewUrl(orderId: string, seed: number) {
  const params = new URLSearchParams({
    orderId,
    preview: seed.toString(),
  })

  return `/api/pdf/invoice?${params.toString()}#toolbar=0&navpanes=0&scrollbar=0&page=1&zoom=page-fit`
}

function buildActionUrl(path: string, orderId: string) {
  const params = new URLSearchParams({ orderId })

  return `${path}?${params.toString()}`
}

export default function PdfPreviewPanel() {
  const [previewSeed, setPreviewSeed] = useState(0)
  const [orders, setOrders] = useState<PreviewOrder[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState("")
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [orderError, setOrderError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    async function loadOrders() {
      setIsLoadingOrders(true)
      setOrderError(null)

      try {
        const response = await fetch("/api/orders", {
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`Failed to load orders: ${response.status}`)
        }

        const data: { orders?: PreviewOrder[] } = await response.json()
        const nextOrders = data.orders ?? []

        if (!isActive) {
          return
        }

        setOrders(nextOrders)
        setSelectedOrderId((current) => current || nextOrders[0]?.id || "")
      } catch {
        if (isActive) {
          setOrderError("注文一覧の取得に失敗しました。")
        }
      } finally {
        if (isActive) {
          setIsLoadingOrders(false)
        }
      }
    }

    void loadOrders()

    return () => {
      isActive = false
    }
  }, [])

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  )

  const previewUrl = useMemo(() => {
    if (!selectedOrderId) {
      return "about:blank"
    }

    return buildPreviewUrl(selectedOrderId, previewSeed)
  }, [previewSeed, selectedOrderId])

  const openPdfUrl = useMemo(() => {
    if (!selectedOrderId) {
      return "about:blank"
    }

    return buildActionUrl("/api/pdf/invoice", selectedOrderId)
  }, [selectedOrderId])

  const savePdfUrl = useMemo(() => {
    if (!selectedOrderId) {
      return "about:blank"
    }

    return buildActionUrl("/api/pdf/invoice/store", selectedOrderId)
  }, [selectedOrderId])

  const signedUrl = useMemo(() => {
    if (!selectedOrderId) {
      return "about:blank"
    }

    return buildActionUrl("/api/pdf/invoice/signed-url", selectedOrderId)
  }, [selectedOrderId])

  const previewLabel = selectedOrder
    ? `${selectedOrder.id} / ${selectedOrder.customerName}`
    : "注文を選択してください"

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" />
          注文連携 PDF プレビュー
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            対象注文
          </label>
          <select
            className="h-10 w-full border border-border bg-background px-3 text-sm text-foreground"
            disabled={isLoadingOrders || orders.length === 0}
            value={selectedOrderId}
            onChange={(event) => setSelectedOrderId(event.target.value)}
          >
            {orders.length === 0 ? (
              <option value="">
                {isLoadingOrders ? "注文を読み込み中..." : "注文がありません"}
              </option>
            ) : null}
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.id} / {order.customerName} / {order.status}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{previewLabel}</p>
          {orderError ? (
            <p className="text-xs text-destructive">{orderError}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreviewSeed((seed) => seed + 1)}
            className="inline-flex h-10 items-center justify-center gap-1.5 border border-transparent bg-primary px-6 text-xs font-semibold tracking-widest text-primary-foreground transition-colors hover:bg-primary/80"
            disabled={!selectedOrderId}
          >
            <RotateCcw className="size-4" />
            プレビューを更新
          </button>

          <a
            className="inline-flex h-10 items-center gap-2 border border-border bg-transparent px-4 text-xs font-semibold tracking-widest uppercase text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            href={openPdfUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              if (!selectedOrderId) {
                event.preventDefault()
              }
            }}
            aria-disabled={!selectedOrderId}
          >
            <FileDown className="size-4" />
            PDF を開く
          </a>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="mb-3 text-sm text-muted-foreground">
            注文一覧から選んだ実データをそのまま請求書に反映します。
          </div>

          <div
            className="overflow-hidden rounded-md border border-border bg-background"
            style={{ aspectRatio: "210 / 297" }}
          >
            <iframe
              key={previewUrl}
              title="PDF プレビュー"
              src={previewUrl}
              className="block h-full w-full border-0"
            />
          </div>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <a
            className="inline-flex h-10 items-center justify-center border border-border px-4 text-xs font-semibold tracking-widest uppercase text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            href={savePdfUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              if (!selectedOrderId) {
                event.preventDefault()
              }
            }}
            aria-disabled={!selectedOrderId}
          >
            S3 に保存
          </a>
          <a
            className="inline-flex h-10 items-center justify-center border border-border px-4 text-xs font-semibold tracking-widest uppercase text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            href={signedUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              if (!selectedOrderId) {
                event.preventDefault()
              }
            }}
            aria-disabled={!selectedOrderId}
          >
            署名付き URL
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
