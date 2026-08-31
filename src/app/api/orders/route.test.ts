import { describe, expect, it, vi } from "vitest"

const {
  createOrderMock,
  getAuthSessionMock,
  searchOrdersMock,
} = vi.hoisted(() => ({
  createOrderMock: vi.fn(),
  getAuthSessionMock: vi.fn(),
  searchOrdersMock: vi.fn(),
}))

vi.mock("@/features/auth/cognito-auth.server", () => ({
  getAuthSession: getAuthSessionMock,
}))

vi.mock("@/features/orders/services/order-service", () => ({
  createOrder: createOrderMock,
  searchOrders: searchOrdersMock,
}))

import { GET, POST } from "@/app/api/orders/route"
import type { AuthSession } from "@/features/auth/cognito-auth.server"

function buildSession(role: AuthSession["role"]): AuthSession {
  return {
    authenticated: true,
    displayName: `${role}-user`,
    groups: [role],
    role,
    subject: `${role}-sub`,
    username: `${role}-name`,
  }
}

describe("/api/orders authorization", () => {
  it("returns 401 for unauthenticated requests", async () => {
    getAuthSessionMock.mockResolvedValue(null)

    const response = await GET(new Request("http://localhost/api/orders") as never)

    expect(response.status).toBe(401)
  })

  it("returns 403 when a viewer tries to create an order", async () => {
    getAuthSessionMock.mockResolvedValue(buildSession("viewer"))

    const response = await POST(
      new Request("http://localhost/api/orders", {
        body: JSON.stringify({}),
        method: "POST",
      }) as never,
    )

    expect(response.status).toBe(403)
  })

  it("allows operators to create orders", async () => {
    getAuthSessionMock.mockResolvedValue(buildSession("operator"))
    createOrderMock.mockResolvedValue({
      id: "ORD-001",
      status: "pending",
      totalAmount: 1000,
    })

    const response = await POST(
      new Request("http://localhost/api/orders", {
        body: JSON.stringify({
          customerEmail: "operator@example.com",
          customerName: "Operator User",
          items: [{ productName: "商品A", quantity: 1, unitPrice: 1000 }],
          paymentMethod: "credit-card",
          shippingAddress: "東京都千代田区1-1-1",
        }),
        method: "POST",
      }) as never,
    )

    expect(response.status).toBe(201)
    expect(createOrderMock).toHaveBeenCalledTimes(1)
  })
})
