import { describe, expect, it, vi } from "vitest"

import { logError, logInfo, logWarn } from "@/lib/logging.server"

describe("logging.server", () => {
  it("serializes structured info logs", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined)

    logInfo("Order created", {
      eventId: "evt-001",
      orderId: "ORD-001",
      requestId: "req-001",
    })

    const payload = JSON.parse(spy.mock.calls[0]?.[0] as string) as {
      eventId?: string
      level?: string
      message?: string
      orderId?: string
      requestId?: string
    }

    expect(payload).toMatchObject({
      eventId: "evt-001",
      level: "info",
      message: "Order created",
      orderId: "ORD-001",
      requestId: "req-001",
    })
    spy.mockRestore()
  })

  it("serializes structured warning logs", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined)

    logWarn("Order backlog is growing", {
      orderId: "ORD-002",
    })

    expect(JSON.parse(spy.mock.calls[0]?.[0] as string)).toMatchObject({
      level: "warn",
      message: "Order backlog is growing",
      orderId: "ORD-002",
    })
    spy.mockRestore()
  })

  it("serializes errors with message and stack", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined)
    const error = new Error("boom")

    logError("Failed to publish event", error, {
      detailType: "OrderCreated",
      orderId: "ORD-003",
    })

    expect(spy).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(spy.mock.calls[0]?.[0] as string) as {
      error?: { message?: string; name?: string; stack?: string }
      level?: string
      message?: string
    }

    expect(payload.level).toBe("error")
    expect(payload.message).toBe("Failed to publish event")
    expect(payload.error?.message).toBe("boom")
    expect(payload.error?.name).toBe("Error")
    spy.mockRestore()
  })
})
