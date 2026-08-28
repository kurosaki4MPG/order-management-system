import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// カード系コンポーネントが、共通のコンテナ構造と slot 属性を持つことを確認する。
describe("Card", () => {
  // 各サブコンポーネントが期待どおりの見た目と属性で描画されることを確認する。
  it("renders all card parts with the expected slots and class names", () => {
    const { container } = render(
      <Card className="custom-card" size="sm">
        <CardHeader className="custom-header">
          <CardTitle>請求書</CardTitle>
          <CardDescription>説明文</CardDescription>
          <CardAction>操作</CardAction>
        </CardHeader>
        <CardContent className="custom-content">本文</CardContent>
        <CardFooter className="custom-footer">フッター</CardFooter>
      </Card>
    )

    const card = container.querySelector("[data-slot='card']")
    // カード本体に slot 属性、サイズ属性、独自クラスが反映されることを確認する。
    expect(card).toHaveAttribute("data-size", "sm")
    expect(card).toHaveClass("custom-card")

    // 各領域がそれぞれの slot と内容を持って描画されることを確認する。
    expect(screen.getByText("請求書")).toHaveAttribute("data-slot", "card-title")
    expect(screen.getByText("説明文")).toHaveAttribute(
      "data-slot",
      "card-description"
    )
    expect(screen.getByText("操作")).toHaveAttribute("data-slot", "card-action")
    expect(screen.getByText("本文")).toHaveAttribute("data-slot", "card-content")
    expect(screen.getByText("フッター")).toHaveAttribute("data-slot", "card-footer")
    expect(container.querySelector("[data-slot='card-header']")).toHaveClass(
      "custom-header"
    )
    expect(container.querySelector("[data-slot='card-content']")).toHaveClass(
      "custom-content"
    )
    expect(container.querySelector("[data-slot='card-footer']")).toHaveClass(
      "custom-footer"
    )
  })
})
