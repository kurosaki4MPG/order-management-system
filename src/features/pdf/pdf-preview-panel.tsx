"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, FileDown, FileText, RotateCcw } from "lucide-react"

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
  const [isOrderPickerOpen, setIsOrderPickerOpen] = useState(false)
  const orderPickerRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    if (!isOrderPickerOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target

      if (!(target instanceof Node)) {
        return
      }

      if (!orderPickerRef.current?.contains(target)) {
        setIsOrderPickerOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOrderPickerOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOrderPickerOpen])

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

  return (
    <Card className="overflow-hidden py-0">
      {/* <CardHeader className="border-b border-border/70">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" />
          注文連携 PDF プレビュー
        </CardTitle>
      </CardHeader> */}
      <CardContent className="space-y-4 p-4">
        <div className="relative space-y-2" ref={orderPickerRef}>
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            対象注文
          </label>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between gap-3 border border-border bg-background px-3 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            disabled={isLoadingOrders || orders.length === 0}
            aria-haspopup="listbox"
            aria-expanded={isOrderPickerOpen}
            onClick={() => setIsOrderPickerOpen((current) => !current)}
          >
            <span className="min-w-0 flex-1 truncate">
              {selectedOrder ? (
                <>
                  <span className="font-mono tracking-tight">
                    {selectedOrder.id}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    / {selectedOrder.customerName} / {selectedOrder.status}
                  </span>
                </>
              ) : (
                <span>
                  {isLoadingOrders ? "注文を読み込み中..." : "注文がありません"}
                </span>
              )}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
          {isOrderPickerOpen && orders.length > 0 ? (
            <div
              className="absolute z-20 mt-2 max-h-72 w-full overflow-auto border border-border bg-background shadow-lg"
              role="listbox"
              aria-label="対象注文一覧"
            >
              {orders.map((order) => {
                const isSelected = order.id === selectedOrderId

                return (
                  <button
                    key={order.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className="flex w-full items-start gap-3 border-b border-border/60 px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-muted data-[selected=true]:bg-muted"
                    data-selected={isSelected}
                    onClick={() => {
                      setSelectedOrderId(order.id)
                      setIsOrderPickerOpen(false)
                    }}
                  >
                    <span className="font-mono tracking-tight">
                      {order.id}
                    </span>
                    <span className="min-w-0 flex-1 text-muted-foreground">
                      / {order.customerName} / {order.status}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}
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

          <a
            className="ms-auto inline-flex h-10 items-center justify-center border border-border px-4 text-xs font-semibold tracking-widest uppercase text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
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
      </CardContent>
    </Card>
  )
}
