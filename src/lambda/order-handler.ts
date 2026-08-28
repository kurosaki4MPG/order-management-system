// 学習用のサンプルハンドラ。API 連携の最小疎通を確認するための簡易レスポンスを返す。
type ApiGatewayEvent = {
  body?: string | null;
  headers?: Record<string, string | undefined>;
  httpMethod?: string;
  path?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
};

type LambdaResult = {
  body: string;
  headers: Record<string, string>;
  statusCode: number;
};

type OrderPreview = {
  message: string;
  method: string;
  path: string;
  requestId?: string;
};

type CreateOrderInput = {
  customerName?: string;
  itemCount?: number;
};

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

function response(statusCode: number, body: unknown): LambdaResult {
  return {
    body: JSON.stringify(body),
    headers: jsonHeaders,
    statusCode,
  };
}

function readRequestId(headers?: Record<string, string | undefined>) {
  return headers?.["x-request-id"] ?? headers?.["X-Request-Id"];
}

function parseBody(body?: string | null): CreateOrderInput {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body) as CreateOrderInput;
  } catch {
    return {};
  }
}

export async function handler(event: ApiGatewayEvent): Promise<LambdaResult> {
  const method = event.httpMethod ?? "GET";
  const path = event.path ?? "/";

  if (method === "GET") {
    // GET は Lambda が生きているかを確認するヘルスチェック的な応答にする。
    const payload: OrderPreview = {
      message: "Lambda is ready.",
      method,
      path,
      requestId: readRequestId(event.headers),
    };

    return response(200, payload);
  }

  if (method === "POST") {
    // POST は受け取った値を最低限検証して、入力の形だけ確認できるようにする。
    const input = parseBody(event.body);
    const customerName = input.customerName?.trim() ?? "";
    const itemCount = input.itemCount ?? 0;

    if (!customerName) {
      return response(400, {
        error: "customerName is required",
      });
    }

    return response(201, {
      accepted: true,
      customerName,
      itemCount,
      receivedAt: new Date().toISOString(),
    });
  }

  return response(405, {
    error: "Method Not Allowed",
    allowedMethods: ["GET", "POST"],
  });
}
