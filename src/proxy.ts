import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const AUTH_COOKIE_NAME = "oms_auth_id_token"

const PUBLIC_PATH_PREFIXES = [
  "/api/auth",
  "/forbidden",
  "/login",
  "/_next",
  "/favicon.ico",
]

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  const isPublicPath = PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (hasSession || isPublicPath) {
    return NextResponse.next()
  }

  const loginUrl = new URL("/login", request.url)
  const returnTo = `${pathname}${search}`
  loginUrl.searchParams.set("returnTo", returnTo)

  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
}
