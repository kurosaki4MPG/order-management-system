import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import PdfPreviewPanel from "@/features/pdf/pdf-preview-panel"

type PreviewOrder = {
  customerName: string
  id: string
  orderedAt: string
  status: string
  totalAmount: number
}

const sampleOrders: PreviewOrder[] = [
  {
    customerName: "山田 太郎",
    id: "ORD-001",
    orderedAt: "2026-08-27T00:00:00.000Z",
    status: "pending",
    totalAmount: 1200,
  },
  {
    customerName: "佐藤 花子",
    id: "ORD-002",
    orderedAt: "2026-08-27T01:00:00.000Z",
    status: "shipped",
    totalAmount: 3600,
  },
]

// PDF プレビューは、注文選択・再生成・外部導線・失敗時の表示を 1 画面で扱う。
describe("PdfPreviewPanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ orders: sampleOrders }),
        ok: true,
        status: 200,
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  // 注文を選べると、プレビュー URL と各導線が注文 ID に連動することを確認する。
  it("loads orders and keeps the preview actions in sync with the selected order", async () => {
    render(<PdfPreviewPanel />)

    const orderSelect = screen.getByRole("combobox")

    await waitFor(() => {
      // 初期表示で最初の注文が選択されることを確認する。
      expect(orderSelect).toHaveValue("ORD-001")
    })

    const previewFrame = screen.getByTitle("PDF プレビュー")
    // 初期プレビュー URL に注文 ID と seed が入ることを確認する。
    expect(previewFrame).toHaveAttribute(
      "src",
      expect.stringContaining("orderId=ORD-001")
    )
    expect(previewFrame).toHaveAttribute(
      "src",
      expect.stringContaining("preview=0")
    )

    fireEvent.click(screen.getByRole("button", { name: "プレビューを更新" }))

    await waitFor(() => {
      // 再生成操作で seed が更新され、iframe の URL が差し替わることを確認する。
      expect(screen.getByTitle("PDF プレビュー")).toHaveAttribute(
        "src",
        expect.stringContaining("preview=1")
      )
    })

    fireEvent.change(orderSelect, {
      target: { value: "ORD-002" },
    })

    await waitFor(() => {
      // 注文切り替えで選択値が更新されることを確認する。
      expect(orderSelect).toHaveValue("ORD-002")
    })

    const openLink = screen.getByRole("link", { name: "PDF を開く" })
    const saveLink = screen.getByRole("link", { name: "S3 に保存" })
    const signedLink = screen.getByRole("link", { name: "署名付き URL" })

    // 保存・ダウンロード導線が選択注文に連動することを確認する。
    expect(openLink).toHaveAttribute(
      "href",
      expect.stringContaining("orderId=ORD-002")
    )
    expect(saveLink).toHaveAttribute(
      "href",
      expect.stringContaining("orderId=ORD-002")
    )
    expect(signedLink).toHaveAttribute(
      "href",
      expect.stringContaining("orderId=ORD-002")
    )
  })

  // 注文取得に失敗したときは、画面側でエラーを表示することを確認する。
  it("shows an error message when loading orders fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })
    )

    render(<PdfPreviewPanel />)

    // 注文一覧の取得失敗メッセージが表示されることを確認する。
    expect(
      await screen.findByText("注文一覧の取得に失敗しました。")
    ).toBeInTheDocument()
  })

  // プレビュー枠の比率と操作エリアが表示され、レイアウトが意図どおりであることを確認する。
  it("renders the preview frame with the expected layout structure", async () => {
    render(<PdfPreviewPanel />)

    await waitFor(() => {
      // プレビューの見出しが表示されることを確認する。
      expect(
        screen.getByText("注文連携 PDF プレビュー")
      ).toBeInTheDocument()
    })

    const previewFrame = screen.getByTitle("PDF プレビュー")
    const frameContainer = previewFrame.parentElement

    // プレビュー枠が A4 比率で固定されることを確認する。
    expect(frameContainer).toHaveAttribute(
      "style",
      expect.stringContaining("aspect-ratio: 210 / 297")
    )
    // iframe が枠いっぱいに広がる設定であることを確認する。
    expect(previewFrame).toHaveClass("block", "h-full", "w-full", "border-0")
    // 操作ボタン群が表示されることを確認する。
    expect(screen.getByRole("button", { name: "プレビューを更新" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "PDF を開く" })).toBeInTheDocument()
  })
})
