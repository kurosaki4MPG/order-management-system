import { afterEach, describe, expect, it, vi } from "vitest"

import {
  AUTH_COOKIE_NAMES,
  buildAuthorizeUrl,
  buildLogoutUrl,
  createPkceChallenge,
  createPkceVerifier,
  getCognitoAuthConfig,
  parseIdTokenClaims,
  readAuthSessionFromIdToken,
  sanitizeReturnTo,
} from "@/features/auth/cognito-auth.server"

function encodeBase64Url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function buildTestJwt(payload: Record<string, unknown>) {
  return [
    encodeBase64Url(JSON.stringify({ alg: "none", typ: "JWT" })),
    encodeBase64Url(JSON.stringify(payload)),
    "",
  ].join(".")
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("cognito auth helpers", () => {
  it("sanitizes returnTo values to safe relative paths", () => {
    expect(sanitizeReturnTo("/orders?status=open")).toBe("/orders?status=open")
    expect(sanitizeReturnTo("https://example.com")).toBe("/")
    expect(sanitizeReturnTo("//evil.example.com")).toBe("/")
    expect(sanitizeReturnTo("")).toBe("/")
  })

  it("creates a PKCE challenge that matches the RFC 7636 example", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"

    expect(await createPkceChallenge(verifier)).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    )
  })

  it("creates a PKCE verifier with enough entropy", () => {
    const verifier = createPkceVerifier()

    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it("builds Cognito authorize and logout URLs from the shared config", () => {
    vi.stubEnv("COGNITO_USER_POOL_CLIENT_ID", "client-123")
    vi.stubEnv("COGNITO_DOMAIN_BASE_URL", "https://auth.example.com/")
    vi.stubEnv("COGNITO_LOGOUT_URI", "http://localhost:3000/login")
    vi.stubEnv("COGNITO_REDIRECT_URI", "http://localhost:3000/api/auth/callback")

    const config = getCognitoAuthConfig()

    const authorizeUrl = new URL(
      buildAuthorizeUrl(config, {
        codeChallenge: "challenge-123",
        returnTo: "/orders",
      }),
    )
    // Cognito Hosted UI に必要なパラメータが正しく並ぶことを確認する。
    expect(authorizeUrl.pathname).toBe("/oauth2/authorize")
    expect(authorizeUrl.searchParams.get("client_id")).toBe("client-123")
    expect(authorizeUrl.searchParams.get("code_challenge")).toBe("challenge-123")
    expect(authorizeUrl.searchParams.get("code_challenge_method")).toBe("S256")
    expect(authorizeUrl.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/callback",
    )
    expect(authorizeUrl.searchParams.get("response_type")).toBe("code")
    expect(authorizeUrl.searchParams.get("scope")).toBe("openid email profile")
    expect(authorizeUrl.searchParams.get("state")).toBe("/orders")

    const logoutUrl = new URL(buildLogoutUrl(config))
    // ログアウト URL も Cognito Hosted UI の形式になっていることを確認する。
    expect(logoutUrl.pathname).toBe("/logout")
    expect(logoutUrl.searchParams.get("client_id")).toBe("client-123")
    expect(logoutUrl.searchParams.get("logout_uri")).toBe(
      "http://localhost:3000/login",
    )
  })

  it("parses id token claims into a compact auth session", () => {
    const token = buildTestJwt({
      "cognito:groups": ["admin", "operator"],
      "cognito:username": "test-user",
      email: "test@example.com",
      name: "Test User",
      sub: "sub-123",
    })

    const claims = parseIdTokenClaims(token)
    // JWT の payload がそのまま読み取れることを確認する。
    expect(claims.email).toBe("test@example.com")
    expect(claims.sub).toBe("sub-123")

    const session = readAuthSessionFromIdToken(token)
    // セッションには画面表示に必要な最小限の情報だけが入ることを確認する。
    expect(session.authenticated).toBe(true)
    expect(session.displayName).toBe("test@example.com")
    expect(session.username).toBe("test-user")
    expect(session.subject).toBe("sub-123")
    expect(session.groups).toEqual(["admin", "operator"])
  })

  it("exposes the cookie names used by the auth flow", () => {
    // ログイン、PKCE、ログアウトの cookie 名が固定であることを確認する。
    expect(AUTH_COOKIE_NAMES.idToken).toBe("oms_auth_id_token")
    expect(AUTH_COOKIE_NAMES.accessToken).toBe("oms_auth_access_token")
    expect(AUTH_COOKIE_NAMES.refreshToken).toBe("oms_auth_refresh_token")
    expect(AUTH_COOKIE_NAMES.pkceVerifier).toBe("oms_auth_pkce_verifier")
  })
})
