type SqsMessage = {
  body?: string;
  messageId?: string;
  receiptHandle?: string;
};

type SqsEvent = {
  Records?: SqsMessage[];
};

// SQS に積まれた EventBridge イベントは、最低限の識別子が揃っている前提で扱う。
type EventBridgeDetail = {
  detail?: {
    eventId?: string;
    orderId?: string;
    [key: string]: unknown;
  };
  "detail-type"?: string;
  id?: string;
  source?: string;
  time?: string;
};

function parseBody(body?: string) {
  if (!body) {
    return undefined;
  }

  try {
    return JSON.parse(body) as EventBridgeDetail;
  } catch {
    return undefined;
  }
}

function assertEventBridgeDetail(payload: EventBridgeDetail | undefined) {
  // 壊れたメッセージは例外で落として、再試行と DLQ 移送に乗せる。
  const detailType = payload?.["detail-type"];
  const orderId = payload?.detail?.orderId;
  const eventId = payload?.detail?.eventId ?? payload?.id;

  if (!detailType || !orderId || !eventId) {
    throw new Error(
      "Invalid EventBridge message received from SQS: detail-type, orderId, and eventId are required"
    );
  }

  return {
    detailType,
    eventId,
    orderId,
  };
}

export async function handler(event: SqsEvent): Promise<{ ok: true }> {
  for (const record of event.Records ?? []) {
    // 現段階では処理せずログだけ出し、後続ワークフローの起点にする。
    const payload = parseBody(record.body);
    const { detailType, eventId, orderId } = assertEventBridgeDetail(payload);

    console.log("SQS message received", {
      detailType,
      eventId,
      messageId: record.messageId,
      orderId,
      source: payload?.source ?? "unknown",
      time: payload?.time ?? "unknown",
    });
  }

  return {
    ok: true,
  };
}
