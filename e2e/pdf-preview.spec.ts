import { expect, test } from "./coverage"

const orders = [
  {
    customerName: "山田 太郎",
    id: "ORD-TEST-001",
    orderedAt: "2026-08-27T00:00:00.000Z",
    paymentMethod: "credit-card",
    status: "pending",
    totalAmount: 1200,
  },
  {
    customerName: "佐藤 花子",
    id: "ORD-TEST-002",
    orderedAt: "2026-08-27T01:00:00.000Z",
    paymentMethod: "bank-transfer",
    status: "processing",
    totalAmount: 2400,
  },
]

test("PDF プレビューで注文を切り替え、生成 URL を確認できる", async ({
  page,
}) => {
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        body: JSON.stringify({ orders, total: orders.length }),
        contentType: "application/json; charset=utf-8",
        status: 200,
      })
      return
    }

    await route.continue()
  })

  await page.route("**/api/pdf/invoice**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const orderId = url.searchParams.get("orderId")
    const preview = url.searchParams.get("preview")

    await route.fulfill({
      body: `<html><body>preview ${orderId} ${preview}</body></html>`,
      contentType: "text/html; charset=utf-8",
      status: 200,
    })
  })

  await page.goto("/pdf-preview")

  const orderSelect = page.locator("select").first()
  await expect(orderSelect).toHaveValue("ORD-TEST-001")
  await expect(
    page.locator("p.text-xs.text-muted-foreground").filter({
      hasText: "ORD-TEST-001 / 山田 太郎",
    })
  ).toBeVisible()

  const iframe = page.getByTitle("PDF プレビュー")
  await expect(iframe).toHaveAttribute(
    "src",
    expect.stringContaining("orderId=ORD-TEST-001")
  )

  await orderSelect.selectOption("ORD-TEST-002")

  await expect(
    page.locator("p.text-xs.text-muted-foreground").filter({
      hasText: "ORD-TEST-002 / 佐藤 花子",
    })
  ).toBeVisible()

  await page.getByRole("button", { name: "プレビューを更新" }).click()

  await expect(iframe).toHaveAttribute(
    "src",
    expect.stringContaining("orderId=ORD-TEST-002")
  )
  await expect(iframe).toHaveAttribute(
    "src",
    expect.stringContaining("preview=1")
  )

  await expect(page.getByRole("link", { name: "S3 に保存" })).toHaveAttribute(
    "href",
    expect.stringContaining("orderId=ORD-TEST-002")
  )
  await expect(
    page.getByRole("link", { name: "署名付き URL" })
  ).toHaveAttribute("href", expect.stringContaining("orderId=ORD-TEST-002"))
})

test("PDF プレビューは注文一覧の取得失敗を表示する", async ({ page }) => {
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue()
      return
    }

    await route.fulfill({
      body: JSON.stringify({
        error: "Service Unavailable",
      }),
      contentType: "application/json; charset=utf-8",
      status: 503,
    })
  })

  await page.goto("/pdf-preview")

  // 一覧取得失敗時はエラーメッセージが出て、注文未選択のままになることを確認する。
  await expect(
    page.getByText("注文一覧の取得に失敗しました。")
  ).toBeVisible()
  await expect(page.locator("select").first()).toBeDisabled()
  await expect(
    page.getByRole("button", { name: "プレビューを更新" })
  ).toBeDisabled()
})
