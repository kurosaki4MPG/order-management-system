// API の危ない入口だけを共通で守る。
// ブラウザ由来の cross-site リクエストを弾き、JSON 受付と併せて防御線を作る。

function getRequestOrigin(request: Request) {
  return new URL(request.url).origin
}

function isSameOriginValue(request: Request, candidate: string) {
  return candidate === getRequestOrigin(request)
}

function isCrossSiteFetch(request: Request) {
  const site = request.headers.get("sec-fetch-site")

  return site === "cross-site" || site === "none"
}

export function assertSameOriginRequest(
  request: Request,
  purpose: string
): Response | null {
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")

  if (isCrossSiteFetch(request)) {
    return Response.json(
      {
        error: `${purpose} requires same-origin requests`,
      },
      { status: 403 }
    )
  }

  if (origin && !isSameOriginValue(request, origin)) {
    return Response.json(
      {
        error: `${purpose} requires same-origin requests`,
      },
      { status: 403 }
    )
  }

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin

      if (!isSameOriginValue(request, refererOrigin)) {
        return Response.json(
          {
            error: `${purpose} requires same-origin requests`,
          },
          { status: 403 }
        )
      }
    } catch {
      return Response.json(
        {
          error: `${purpose} requires same-origin requests`,
        },
        { status: 403 }
      )
    }
  }

  return null
}

export function assertJsonRequest(request: Request, purpose: string) {
  const contentType = request.headers.get("content-type") ?? ""

  if (!contentType.toLowerCase().includes("application/json")) {
    return Response.json(
      {
        error: `${purpose} requires application/json`,
      },
      { status: 415 }
    )
  }

  return null
}
