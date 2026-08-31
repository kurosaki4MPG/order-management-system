import type { AuthRole, AuthSession } from "@/features/auth/cognito-auth.server"

export const AUTH_ROLES: readonly AuthRole[] = ["admin", "operator", "viewer"]

const roleLabels: Record<AuthRole, string> = {
  admin: "管理者",
  operator: "オペレーター",
  viewer: "閲覧専用",
}

export function getRoleLabel(role: AuthRole) {
  return roleLabels[role]
}

export function canViewOrders(session: AuthSession | null) {
  return Boolean(session)
}

export function canCreateOrders(session: AuthSession | null) {
  return session?.role === "admin" || session?.role === "operator"
}

export function canUpdateOrderStatus(session: AuthSession | null) {
  return session?.role === "admin" || session?.role === "operator"
}

export function canDeleteOrders(session: AuthSession | null) {
  return session?.role === "admin"
}

export function canAccessOrdersNav(session: AuthSession | null) {
  return Boolean(session)
}

export function getHighestRoleLabel(session: AuthSession | null) {
  if (!session) {
    return "未ログイン"
  }

  return getRoleLabel(session.role)
}

export function createAuthorizationResponse(
  message: string,
  status = 403,
): Response {
  return Response.json(
    {
      error: message,
    },
    { status },
  )
}

export function requireAuthSession(session: AuthSession | null) {
  return session
}
