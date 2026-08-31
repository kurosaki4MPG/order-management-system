import { describe, expect, it } from "vitest"

import {
  canAccessOrdersNav,
  canCreateOrders,
  canDeleteOrders,
  canUpdateOrderStatus,
  getHighestRoleLabel,
} from "@/features/auth/authorization.server"
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

describe("authorization helpers", () => {
  it("allows viewers to only browse orders", () => {
    const session = buildSession("viewer")

    expect(canAccessOrdersNav(session)).toBe(true)
    expect(canCreateOrders(session)).toBe(false)
    expect(canUpdateOrderStatus(session)).toBe(false)
    expect(canDeleteOrders(session)).toBe(false)
    expect(getHighestRoleLabel(session)).toBe("閲覧専用")
  })

  it("allows operators to create and update but not delete", () => {
    const session = buildSession("operator")

    expect(canCreateOrders(session)).toBe(true)
    expect(canUpdateOrderStatus(session)).toBe(true)
    expect(canDeleteOrders(session)).toBe(false)
    expect(getHighestRoleLabel(session)).toBe("オペレーター")
  })

  it("allows admins to do every order action", () => {
    const session = buildSession("admin")

    expect(canCreateOrders(session)).toBe(true)
    expect(canUpdateOrderStatus(session)).toBe(true)
    expect(canDeleteOrders(session)).toBe(true)
    expect(getHighestRoleLabel(session)).toBe("管理者")
  })
})
