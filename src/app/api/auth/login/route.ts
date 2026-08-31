import { NextRequest, NextResponse } from "next/server"

import {
  AUTH_COOKIE_NAMES,
  buildAuthorizeUrl,
  buildAuthCookieOptions,
  createPkceChallenge,
  createPkceVerifier,
  getCognitoAuthConfig,
  sanitizeReturnTo,
} from "@/features/auth/cognito-auth.server"

export async function GET(request: NextRequest) {
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("returnTo"))
  const verifier = createPkceVerifier()
  const codeChallenge = await createPkceChallenge(verifier)
  const config = getCognitoAuthConfig()
  const redirectUrl = buildAuthorizeUrl(config, {
    codeChallenge,
    returnTo,
  })

  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set(
    AUTH_COOKIE_NAMES.pkceVerifier,
    verifier,
    buildAuthCookieOptions(10 * 60),
  )

  return response
}
