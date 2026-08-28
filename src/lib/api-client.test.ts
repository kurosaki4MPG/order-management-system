import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError, requestJson } from "@/lib/api-client"

// API クライアントが、ローカルと AWS API Gateway の両方で正しい URL とエラー契約を作ることを確認する。
describe("requestJson", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  // base URL 未設定時に、同一オリジンのパスをそのまま使うことを確認する。
  it("uses the local path when NEXT_PUBLIC_API_BASE_URL is not set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ ok: true }),
      ok: true,
    })
    vi.stubGlobal("fetch", fetchMock)

    await requestJson<{ ok: boolean }>("/api/orders", {
      query: {
        page: 1,
        query: "test",
      },
    })

    // fetch がローカル API パスを使って呼ばれることを確認する。
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/orders?page=1&query=test",
      expect.objectContaining({
        method: "GET",
      })
    )
  })

  // base URL 設定時に、`/api` プレフィックスを外して AWS 側へ送ることを確認する。
  it("rewrites /api paths when NEXT_PUBLIC_API_BASE_URL is set", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_BASE_URL",
      "https://example.execute-api.ap-northeast-1.amazonaws.com"
    )
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ ok: true }),
      ok: true,
    })
    vi.stubGlobal("fetch", fetchMock)

    await requestJson<{ ok: boolean }>("/api/orders/ORD-001")

    // fetch が AWS API Gateway URL に書き換えられたパスを使うことを確認する。
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.execute-api.ap-northeast-1.amazonaws.com/orders/ORD-001",
      expect.objectContaining({
        method: "GET",
      })
    )
  })

  // HTTP エラー時に、JSON の error を優先して ApiError に載せることを確認する。
  it("throws ApiError with server error payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ error: "Bad Request" }),
      ok: false,
      status: 400,
    })
    vi.stubGlobal("fetch", fetchMock)

    // サーバーの error を ApiError に詰めて返すことを確認する。
    await expect(requestJson("/api/orders")).rejects.toMatchObject({
      body: { error: "Bad Request" },
      message: "Bad Request",
      status: 400,
    })
  })

  // JSON でない失敗レスポンスでも、ステータス付きのエラーに変換されることを確認する。
  it("throws a generic ApiError for non-JSON failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "text/plain" }),
      ok: false,
      status: 500,
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(requestJson("/api/orders")).rejects.toMatchObject({
      message: "Request failed with status 500",
      status: 500,
    })
  })

  // ApiError の型そのものが公開契約として使えることを確認する。
  it("exposes ApiError as a reusable error type", () => {
    const error = new ApiError("failed", 500)

    // ApiError が Error として扱えることを確認する。
    expect(error).toBeInstanceOf(Error)
    // HTTP ステータスコードを保持していることを確認する。
    expect(error.status).toBe(500)
  })

  // 空の query パラメータは URL に含めず、base URL の末尾スラッシュも取り除くことを確認する。
  it("omits empty query parameters and trims the base URL slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://example.com/")
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ ok: true }),
      ok: true,
    })
    vi.stubGlobal("fetch", fetchMock)

    await requestJson<{ ok: boolean }>("/api/orders", {
      body: { name: "注文" },
      query: {
        empty: "",
        nil: null,
        page: 2,
      },
    })

    // 空値が URL から除外され、base URL 末尾の / も正規化されることを確認する。
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/orders?page=2",
      expect.objectContaining({
        body: JSON.stringify({ name: "注文" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        method: "POST",
      })
    )
  })

  // JSON として壊れた成功レスポンスでも、例外ではなく undefined を返すことを確認する。
  it("returns undefined when JSON parsing fails on a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => {
        throw new Error("broken json")
      },
      ok: true,
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(requestJson("/api/orders")).resolves.toBeUndefined()
  })
})
