import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  AUTH_COOKIE_NAMES,
  buildAppLogoutUrl,
  buildLogoutUrl,
  getCognitoAuthConfig,
} from "@/features/auth/cognito-auth.server"

export async function GET(request: Request) {
  const config = getCognitoAuthConfig()
  const response = NextResponse.redirect(
    buildLogoutUrl(config, buildAppLogoutUrl(request.url)),
  )
  const cookieStore = await cookies()

  for (const cookieName of Object.values(AUTH_COOKIE_NAMES)) {
    cookieStore.delete(cookieName)
    response.cookies.delete(cookieName)
  }

  return response
}
