import { createHash, randomBytes } from "node:crypto"

import { cookies } from "next/headers"

export const AUTH_COOKIE_NAMES = {
  accessToken: "oms_auth_access_token",
  idToken: "oms_auth_id_token",
  pkceVerifier: "oms_auth_pkce_verifier",
  refreshToken: "oms_auth_refresh_token",
} as const

export type AuthSession = {
  authenticated: true
  displayName: string
  email?: string
  groups: string[]
  subject: string
  username: string
}

type CognitoAuthConfig = {
  clientId: string
  domainBaseUrl: string
  logoutUri: string
  redirectUri: string
}

type TokenResponse = {
  access_token?: string
  expires_in?: number
  id_token?: string
  refresh_token?: string
  token_type?: string
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required for Cognito authentication`)
  }

  return value
}

export function getCognitoAuthConfig(): CognitoAuthConfig {
  return {
    clientId: requireEnv("COGNITO_USER_POOL_CLIENT_ID"),
    domainBaseUrl: requireEnv("COGNITO_DOMAIN_BASE_URL").replace(/\/+$/, ""),
    logoutUri: requireEnv("COGNITO_LOGOUT_URI"),
    redirectUri: requireEnv("COGNITO_REDIRECT_URI"),
  }
}

function normalizeBase64Url(input: string) {
  return input.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function decodeBase64Url(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/")
  const remainder = padded.length % 4
  const normalized =
    remainder === 0 ? padded : padded + "=".repeat(4 - remainder)

  return Buffer.from(normalized, "base64").toString("utf8")
}

export function sanitizeReturnTo(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed || trimmed === "/") {
    return "/"
  }

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/"
  }

  return trimmed
}

export function createPkceVerifier() {
  return normalizeBase64Url(randomBytes(32).toString("base64"))
}

export async function createPkceChallenge(verifier: string) {
  return normalizeBase64Url(
    createHash("sha256").update(verifier).digest("base64"),
  )
}

export function buildAuthorizeUrl(
  config: CognitoAuthConfig,
  options: { codeChallenge: string; returnTo?: string },
) {
  const url = new URL("/oauth2/authorize", config.domainBaseUrl)
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("code_challenge", options.codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")
  url.searchParams.set("redirect_uri", config.redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "openid email profile")
  url.searchParams.set("state", sanitizeReturnTo(options.returnTo))

  return url.toString()
}

export function buildLogoutUrl(config: CognitoAuthConfig) {
  const url = new URL("/logout", config.domainBaseUrl)
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("logout_uri", config.logoutUri)

  return url.toString()
}

export function parseIdTokenClaims(idToken: string) {
  const parts = idToken.split(".")
  if (parts.length < 2) {
    throw new Error("Invalid id_token format")
  }

  return JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>
}

export function readAuthSessionFromIdToken(idToken: string): AuthSession {
  const claims = parseIdTokenClaims(idToken)
  const groups = Array.isArray(claims["cognito:groups"])
    ? claims["cognito:groups"].filter((group): group is string => typeof group === "string")
    : []

  const email =
    typeof claims.email === "string" ? claims.email : undefined
  const username =
    typeof claims["cognito:username"] === "string"
      ? claims["cognito:username"]
      : typeof claims.preferred_username === "string"
        ? claims.preferred_username
        : typeof claims.sub === "string"
          ? claims.sub
          : "unknown"

  return {
    authenticated: true,
    displayName:
      email ?? (typeof claims.name === "string" ? claims.name : username),
    email,
    groups,
    subject: typeof claims.sub === "string" ? claims.sub : username,
    username,
  }
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  const idToken = cookieStore.get(AUTH_COOKIE_NAMES.idToken)?.value
  if (!idToken) {
    return null
  }

  try {
    return readAuthSessionFromIdToken(idToken)
  } catch {
    return null
  }
}

export async function exchangeCodeForTokens(params: {
  code: string
  codeVerifier: string
}) {
  const config = getCognitoAuthConfig()
  const response = await fetch(new URL("/oauth2/token", config.domainBaseUrl), {
    body: new URLSearchParams({
      client_id: config.clientId,
      code: params.code,
      code_verifier: params.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error(`Cognito token exchange failed with ${response.status}`)
  }

  return (await response.json()) as TokenResponse
}

export function buildAuthCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    maxAge: maxAgeSeconds,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  }
}
