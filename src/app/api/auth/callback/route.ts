import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import {
  AUTH_COOKIE_NAMES,
  buildAuthCookieOptions,
  exchangeCodeForTokens,
  getCognitoAuthConfig,
  sanitizeReturnTo,
} from "@/features/auth/cognito-auth.server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url))
  }

  const state = sanitizeReturnTo(request.nextUrl.searchParams.get("state"))
  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get(AUTH_COOKIE_NAMES.pkceVerifier)?.value
  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL("/login?error=missing_verifier", request.url),
    )
  }

  try {
    const tokenResponse = await exchangeCodeForTokens({
      code,
      codeVerifier,
    })

    const config = getCognitoAuthConfig()
    const redirectResponse = NextResponse.redirect(
      new URL(state ?? "/", config.redirectUri),
    )

    if (tokenResponse.id_token) {
      redirectResponse.cookies.set(
        AUTH_COOKIE_NAMES.idToken,
        tokenResponse.id_token,
        buildAuthCookieOptions(tokenResponse.expires_in ?? 3600),
      )
    }

    if (tokenResponse.access_token) {
      redirectResponse.cookies.set(
        AUTH_COOKIE_NAMES.accessToken,
        tokenResponse.access_token,
        buildAuthCookieOptions(tokenResponse.expires_in ?? 3600),
      )
    }

    if (tokenResponse.refresh_token) {
      redirectResponse.cookies.set(
        AUTH_COOKIE_NAMES.refreshToken,
        tokenResponse.refresh_token,
        buildAuthCookieOptions(30 * 24 * 60 * 60),
      )
    }

    redirectResponse.cookies.delete(AUTH_COOKIE_NAMES.pkceVerifier)

    return redirectResponse
  } catch {
    return NextResponse.redirect(new URL("/login?error=token_exchange", request.url))
  }
}
