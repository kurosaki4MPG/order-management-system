import { expect, test } from "./coverage"

test("注文登録フォームから注文を作成できる", async ({ page }) => {
  await page.route("**/orders", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue()
      return
    }

    const body = route.request().postDataJSON() as {
      customerEmail: string
      customerName: string
      items: Array<{ productName: string; quantity: number; unitPrice: number }>
      paymentMethod: string
      shippingAddress: string
    }

    expect(body.customerName).toBe("山田 太郎")
    expect(body.customerEmail).toBe("yamada@example.com")
    expect(body.items[0]?.productName).toBe("商品A")
    expect(body.items[0]?.quantity).toBe(2)
    expect(body.items[0]?.unitPrice).toBe(1850)

    await route.fulfill({
      body: JSON.stringify({
        order: {
          id: "ORD-20260827-000001",
          status: "pending",
          totalAmount: 3700,
        },
      }),
      contentType: "application/json; charset=utf-8",
      status: 201,
    })
  })

  await page.goto("/orders/new")

  await page.getByLabel("顧客名").fill("山田 太郎")
  await page.getByLabel("メールアドレス").fill("yamada@example.com")
  await page.getByLabel("配送先住所").fill("東京都千代田区1-1-1")
  await page.getByLabel("支払い方法").selectOption("bank-transfer")
  await page.getByLabel("備考").fill("至急発送")
  await page.getByLabel("商品名").fill("商品A")
  await page.getByLabel("数量").fill("2")
  await page.getByLabel("単価").fill("1850")
  await page.getByRole("button", { name: "注文を登録" }).click()

  await expect(page.getByRole("status")).toContainText("注文を登録しました。")
  await expect(page.getByRole("status")).toContainText("ORD-20260827-000001")
  await expect(page.getByRole("status")).toContainText("￥3,700")
})

test("注文登録フォームは空送信時に入力エラーを表示する", async ({ page }) => {
  await page.goto("/orders/new")

  await page.getByRole("button", { name: "注文を登録" }).click()

  // 空送信ではクライアント側のバリデーションだけが出ることを確認する。
  await expect(page.getByText("顧客名を入力してください")).toBeVisible()
  await expect(page.getByText("商品名を入力してください")).toBeVisible()
})

test("注文登録フォームはサーバー失敗時に一般エラーを表示する", async ({
  page,
}) => {
  await page.route("**/orders", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue()
      return
    }

    await route.fulfill({
      body: JSON.stringify({
        error: "Internal Server Error",
      }),
      contentType: "application/json; charset=utf-8",
      status: 500,
    })
  })

  await page.goto("/orders/new")

  await page.getByLabel("顧客名").fill("山田 太郎")
  await page.getByLabel("メールアドレス").fill("yamada@example.com")
  await page.getByLabel("配送先住所").fill("東京都千代田区1-1-1")
  await page.getByLabel("商品名").fill("商品A")
  await page.getByLabel("数量").fill("2")
  await page.getByLabel("単価").fill("1850")
  await page.getByRole("button", { name: "注文を登録" }).click()

  // サーバー失敗時は入力エラーではなく一般エラーが表示されることを確認する。
  await expect(
    page.getByText("注文登録に失敗しました。入力内容を確認して再実行してください。")
  ).toBeVisible()
})
