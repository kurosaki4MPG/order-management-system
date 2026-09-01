import {
  createHash,
  createPublicKey,
  createVerify,
  randomBytes,
} from "node:crypto"

import { cookies } from "next/headers"

import { getAwsRegion } from "@/lib/runtime-config.server"

export const AUTH_COOKIE_NAMES = {
  accessToken: "oms_auth_access_token",
  idToken: "oms_auth_id_token",
  pkceVerifier: "oms_auth_pkce_verifier",
  refreshToken: "oms_auth_refresh_token",
} as const

export type AuthRole = "admin" | "operator" | "viewer"

export type AuthSession = {
  authenticated: true
  displayName: string
  email?: string
  groups: string[]
  role: AuthRole
  subject: string
  username: string
}

type CognitoAuthConfig = {
  clientId: string
  domainBaseUrl: string
  issuerUrl: string
  logoutUri: string
  jwksUrl: string
  userPoolId: string
  redirectUri: string
}

type TokenResponse = {
  access_token?: string
  expires_in?: number
  id_token?: string
  refresh_token?: string
  token_type?: string
}

type CognitoJwks = {
  keys: CognitoJwk[]
}

type JwtParts = {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: Buffer
  signingInput: string
}

type CognitoJwk = {
  [key: string]: string | undefined
  alg?: string
  kid?: string
  use?: string
}

const cognitoJwksCache = new Map<string, Promise<CognitoJwks>>()

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required for Cognito authentication`)
  }

  return value
}

export function getCognitoAuthConfig(): CognitoAuthConfig {
  const userPoolId = requireEnv("COGNITO_USER_POOL_ID")
  const issuerUrl = `https://cognito-idp.${getAwsRegion()}.amazonaws.com/${userPoolId}`

  return {
    clientId: requireEnv("COGNITO_USER_POOL_CLIENT_ID"),
    domainBaseUrl: requireEnv("COGNITO_DOMAIN_BASE_URL").replace(/\/+$/, ""),
    issuerUrl,
    jwksUrl: `${issuerUrl}/.well-known/jwks.json`,
    logoutUri: requireEnv("COGNITO_LOGOUT_URI"),
    userPoolId,
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

function decodeBase64UrlToBuffer(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/")
  const remainder = padded.length % 4
  const normalized =
    remainder === 0 ? padded : padded + "=".repeat(4 - remainder)

  return Buffer.from(normalized, "base64")
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

function buildAuthSessionFromClaims(claims: Record<string, unknown>): AuthSession {
  const groups = Array.isArray(claims["cognito:groups"])
    ? claims["cognito:groups"].filter((group): group is string => typeof group === "string")
    : []
  const role: AuthRole = groups.includes("admin")
    ? "admin"
    : groups.includes("operator")
      ? "operator"
      : "viewer"

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
    role,
    subject: typeof claims.sub === "string" ? claims.sub : username,
    username,
  }
}

export function readAuthSessionFromIdToken(idToken: string): AuthSession {
  return buildAuthSessionFromClaims(parseIdTokenClaims(idToken))
}

function parseJwt(idToken: string): JwtParts {
  const parts = idToken.split(".")
  if (parts.length !== 3) {
    throw new Error("Invalid id_token format")
  }

  return {
    header: JSON.parse(decodeBase64Url(parts[0])) as Record<string, unknown>,
    payload: JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>,
    signature: decodeBase64UrlToBuffer(parts[2]),
    signingInput: `${parts[0]}.${parts[1]}`,
  }
}

async function fetchCognitoJwks(jwksUrl: string) {
  const cached = cognitoJwksCache.get(jwksUrl)
  if (cached) {
    return cached
  }

  const promise = (async () => {
    const response = await fetch(jwksUrl)

    if (!response.ok) {
      throw new Error(`Cognito JWKS fetch failed with ${response.status}`)
    }

    const payload = (await response.json()) as CognitoJwks

    if (!payload || !Array.isArray(payload.keys)) {
      throw new Error("Invalid Cognito JWKS payload")
    }

    return payload
  })()

  cognitoJwksCache.set(jwksUrl, promise)

  return promise
}

function getVerifiedJwtHeader(jwtParts: JwtParts) {
  const alg = jwtParts.header.alg
  const kid = jwtParts.header.kid

  if (alg !== "RS256") {
    throw new Error("Unsupported id_token algorithm")
  }

  if (typeof kid !== "string" || !kid) {
    throw new Error("Missing id_token kid")
  }

  return {
    kid,
  }
}

async function verifyIdTokenSignature(idToken: string, jwksUrl: string) {
  const jwtParts = parseJwt(idToken)
  const { kid } = getVerifiedJwtHeader(jwtParts)
  const jwks = await fetchCognitoJwks(jwksUrl)
  const jwk = jwks.keys.find((key) => key.kid === kid)

  if (!jwk) {
    throw new Error("Cognito signing key not found")
  }

  const publicKey = createPublicKey({
    key: jwk as import("node:crypto").JsonWebKey,
    format: "jwk",
  })

  const verifier = createVerify("RSA-SHA256")
  verifier.update(jwtParts.signingInput)
  verifier.end()

  if (!verifier.verify(publicKey, jwtParts.signature)) {
    throw new Error("Invalid id_token signature")
  }

  return jwtParts.payload
}

function assertVerifiedIdTokenClaims(
  claims: Record<string, unknown>,
  config: CognitoAuthConfig
) {
  const issuer = typeof claims.iss === "string" ? claims.iss : undefined
  const audience = typeof claims.aud === "string" ? claims.aud : undefined
  const tokenUse = typeof claims.token_use === "string" ? claims.token_use : undefined
  const exp = typeof claims.exp === "number" ? claims.exp : undefined
  const nbf = typeof claims.nbf === "number" ? claims.nbf : undefined
  const now = Math.floor(Date.now() / 1000)

  if (issuer !== config.issuerUrl) {
    throw new Error("Invalid id_token issuer")
  }

  if (audience !== config.clientId) {
    throw new Error("Invalid id_token audience")
  }

  if (tokenUse !== "id") {
    throw new Error("Invalid id_token usage")
  }

  if (!exp || exp <= now) {
    throw new Error("Expired id_token")
  }

  if (nbf !== undefined && nbf > now) {
    throw new Error("id_token is not valid yet")
  }
}

export async function verifyAndReadAuthSessionFromIdToken(
  idToken: string,
  config = getCognitoAuthConfig()
) {
  const claims = await verifyIdTokenSignature(idToken, config.jwksUrl)
  assertVerifiedIdTokenClaims(claims, config)

  return buildAuthSessionFromClaims(claims)
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  const idToken = cookieStore.get(AUTH_COOKIE_NAMES.idToken)?.value
  if (!idToken) {
    return null
  }

  try {
    return await verifyAndReadAuthSessionFromIdToken(idToken)
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
