import { describe, expect, it } from "vitest"

import {
  assertJsonRequest,
  assertSameOriginRequest,
} from "@/lib/api-security.server"

describe("api-security.server", () => {
  it("allows same-origin requests", () => {
    const request = new Request("http://localhost/api/orders", {
      headers: {
        Origin: "http://localhost",
        "Sec-Fetch-Site": "same-origin",
      },
      method: "POST",
    })

    // 同一オリジンの要求は許可されることを確認する。
    expect(assertSameOriginRequest(request, "Order creation")).toBeNull()
  })

  it("blocks cross-site requests", () => {
    const request = new Request("http://localhost/api/orders", {
      headers: {
        Origin: "https://evil.example.com",
        "Sec-Fetch-Site": "cross-site",
      },
      method: "POST",
    })

    const response = assertSameOriginRequest(request, "Order creation")

    // cross-site では 403 を返すことを確認する。
    expect(response?.status).toBe(403)
  })

  it("requires application/json when a JSON body is expected", () => {
    const request = new Request("http://localhost/api/orders", {
      headers: {
        "Content-Type": "text/plain",
      },
      method: "POST",
    })

    const response = assertJsonRequest(request, "Order creation")

    // JSON 受け付けの API は content-type が JSON でなければ止まることを確認する。
    expect(response?.status).toBe(415)
  })
})
