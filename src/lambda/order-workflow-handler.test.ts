import { afterEach, describe, expect, it, vi } from "vitest"

import { handler } from "@/lambda/order-workflow-handler"

// ワークフロー用 Lambda が、必須入力・成功分岐・失敗分岐を正しく扱うことを確認する。
describe("order-workflow-handler", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  // 必須項目が欠けている場合は即座に失敗することを確認する。
  it("throws when required workflow fields are missing", async () => {
    await expect(
      handler({
        orderId: "ORD-001",
        step: "prepare",
      })
    ).rejects.toThrow(
      "workflow, step, detailType, orderId, and eventId are required"
    )
  })

  // prepare ステップが正常に通ることを確認する。
  it("returns a completed prepare step", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-27T03:00:00.000Z"))

    const result = await handler({
      detailType: "OrderCreated",
      eventId: "evt-001",
      orderId: "ORD-001",
      step: "prepare",
      workflow: "order-processing",
    })

    // 返却値の step が prepare であることを確認する。
    expect(result.step).toBe("prepare")
    // completedAt が現在時刻で埋まることを確認する。
    expect(result.completedAt).toBe("2026-08-27T03:00:00.000Z")
    // prepareCompletedAt も同じ時刻で返ることを確認する。
    expect(result.prepareCompletedAt).toBe("2026-08-27T03:00:00.000Z")
  })

  // 失敗指示がある prepare は例外を返すことを確認する。
  it("throws a simulated failure when shouldFail is enabled", async () => {
    await expect(
      handler({
        detailType: "OrderCreated",
        eventId: "evt-001",
        orderId: "ORD-001",
        shouldFail: true,
        step: "prepare",
        workflow: "order-processing",
      })
    ).rejects.toThrow("Simulated workflow failure for order ORD-001")
  })

  // finalize ステップは prepareCompletedAt を引き継げることを確認する。
  it("keeps prepareCompletedAt on finalize steps", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-27T04:00:00.000Z"))

    const result = await handler({
      detailType: "OrderCreated",
      eventId: "evt-002",
      orderId: "ORD-001",
      prepareCompletedAt: "2026-08-27T03:30:00.000Z",
      step: "finalize",
      workflow: "order-processing",
    })

    // finalize の場合は step が finalize のままであることを確認する。
    expect(result.step).toBe("finalize")
    // 既存の prepareCompletedAt がそのまま保持されることを確認する。
    expect(result.prepareCompletedAt).toBe("2026-08-27T03:30:00.000Z")
  })

  // invoice 専用の失敗フラグが、後続ステップまで引き継がれることを確認する。
  it("preserves shouldFailInvoice on finalize steps", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-27T05:00:00.000Z"))

    const result = await handler({
      detailType: "OrderCreated",
      eventId: "evt-003",
      orderId: "ORD-001",
      shouldFailInvoice: "true",
      step: "finalize",
      workflow: "order-processing",
    })

    // finalize の結果に invoice 専用フラグが残ることを確認する。
    expect(result.shouldFailInvoice).toBe("true")
  })
})
