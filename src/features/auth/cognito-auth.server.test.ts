import { createSign, generateKeyPairSync } from "node:crypto"

import { cookies } from "next/headers"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  AUTH_COOKIE_NAMES,
  buildAuthorizeUrl,
  buildLogoutUrl,
  createPkceChallenge,
  createPkceVerifier,
  getAuthSession,
  getCognitoAuthConfig,
  parseIdTokenClaims,
  readAuthSessionFromIdToken,
  sanitizeReturnTo,
  verifyAndReadAuthSessionFromIdToken,
} from "@/features/auth/cognito-auth.server"

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}))

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
})

const authJwk = publicKey.export({ format: "jwk" }) as JsonWebKey & {
  alg?: string
  kid?: string
  use?: string
}

authJwk.alg = "RS256"
authJwk.kid = "test-kid"
authJwk.use = "sig"

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

function buildSignedTestJwt(payload: Record<string, unknown>) {
  const header = {
    alg: "RS256",
    kid: "test-kid",
    typ: "JWT",
  }
  const signingInput = [
    encodeBase64Url(JSON.stringify(header)),
    encodeBase64Url(JSON.stringify(payload)),
  ].join(".")
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(privateKey)

  return `${signingInput}.${signature.toString("base64url")}`
}

const mockedCookies = vi.mocked(cookies)

beforeEach(() => {
  vi.stubEnv("AWS_REGION", "ap-northeast-1")
  vi.stubEnv("COGNITO_USER_POOL_CLIENT_ID", "client-123")
  vi.stubEnv("COGNITO_USER_POOL_ID", "ap-northeast-1_testpool")
  vi.stubEnv("COGNITO_DOMAIN_BASE_URL", "https://auth.example.com/")
  vi.stubEnv("COGNITO_LOGOUT_URI", "http://localhost:3000/login")
  vi.stubEnv("COGNITO_REDIRECT_URI", "http://localhost:3000/api/auth/callback")
  mockedCookies.mockReset()
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
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
    expect(config.userPoolId).toBe("ap-northeast-1_testpool")
    expect(config.issuerUrl).toBe(
      "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_testpool",
    )
    expect(config.jwksUrl).toBe(
      "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_testpool/.well-known/jwks.json",
    )

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

  it("verifies a signed id token before creating a session", async () => {
    const token = buildSignedTestJwt({
      aud: "client-123",
      email: "test@example.com",
      exp: Math.floor(Date.now() / 1000) + 60,
      iss: "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_testpool",
      sub: "sub-123",
      token_use: "id",
      "cognito:groups": ["admin"],
      "cognito:username": "test-user",
      name: "Test User",
    })

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ keys: [authJwk] }), {
          status: 200,
        }),
      ),
    )

    mockedCookies.mockResolvedValue({
      get(name: string) {
        if (name === AUTH_COOKIE_NAMES.idToken) {
          return { value: token }
        }

        return undefined
      },
    } as never)

    const session = await getAuthSession()

    // 署名とクレームの検証を通過したトークンだけがセッションになることを確認する。
    expect(session).not.toBeNull()
    expect(session?.role).toBe("admin")
    expect(session?.username).toBe("test-user")
    expect(session?.displayName).toBe("test@example.com")
  })

  it("rejects expired signed id tokens", async () => {
    const token = buildSignedTestJwt({
      aud: "client-123",
      email: "test@example.com",
      exp: Math.floor(Date.now() / 1000) - 60,
      iss: "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_testpool",
      sub: "sub-123",
      token_use: "id",
    })

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ keys: [authJwk] }), {
          status: 200,
        }),
      ),
    )

    await expect(verifyAndReadAuthSessionFromIdToken(token)).rejects.toThrow(
      "Expired id_token",
    )
  })

  it("exposes the cookie names used by the auth flow", () => {
    // ログイン、PKCE、ログアウトの cookie 名が固定であることを確認する。
    expect(AUTH_COOKIE_NAMES.idToken).toBe("oms_auth_id_token")
    expect(AUTH_COOKIE_NAMES.accessToken).toBe("oms_auth_access_token")
    expect(AUTH_COOKIE_NAMES.refreshToken).toBe("oms_auth_refresh_token")
    expect(AUTH_COOKIE_NAMES.pkceVerifier).toBe("oms_auth_pkce_verifier")
  })
})
