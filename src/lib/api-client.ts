// Next.js のローカル API と AWS API Gateway を、環境変数で切り替える。
type ApiErrorBody = {
  error?: string;
  issues?: Record<string, string[]>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly body?: ApiErrorBody;

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type RequestJsonOptions<TBody> = {
  body?: TBody;
  headers?: HeadersInit;
  method?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
};

function buildRequestUrl(
  path: string,
  query?: RequestJsonOptions<never>["query"]
) {
  // base URL があるときだけ `/api` プレフィックスを落として AWS 側に合わせる。
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  const apiPath = baseUrl ? path.replace(/^\/api(?=\/)/, "") : path;
  const requestPath = baseUrl ? `${baseUrl}${apiPath}` : apiPath;

  if (!query) {
    return requestPath;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();

  if (!queryString) {
    return requestPath;
  }

  return `${requestPath}${requestPath.includes("?") ? "&" : "?"}${queryString}`;
}

async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return undefined;
  }

  try {
    return (await response.json()) as ApiErrorBody | undefined;
  } catch {
    return undefined;
  }
}

export async function requestJson<TResponse, TBody = unknown>(
  path: string,
  options: RequestJsonOptions<TBody> = {}
) {
  const response = await fetch(buildRequestUrl(path, options.query), {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    signal: options.signal,
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new ApiError(
      data?.error ?? `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  return data as TResponse;
}
