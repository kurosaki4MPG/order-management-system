import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// EventBridge の注文イベントを、人が読める通知文に整形して SNS に流す。
type EventBridgeOrderEvent<TDetail extends Record<string, unknown>> = {
  account?: string;
  "detail-type": string;
  detail: TDetail;
  id?: string;
  region?: string;
  resources?: string[];
  source?: string;
  time?: string;
  version?: string;
};

type NotificationDetail = {
  customerEmail?: string;
  customerName?: string;
  deletedAt?: string;
  eventId?: string;
  orderId?: string;
  paymentMethod?: string;
  shippingAddress?: string;
  status?: string;
  totalAmount?: number;
  updatedAt?: string;
  version?: number;
};

type NotificationPayload = {
  detailType: string;
  message: string;
  orderId?: string;
  subject: string;
};

const snsClient = new SNSClient({
  region: process.env.AWS_REGION ?? "ap-northeast-1",
});

function assertTopicArn() {
  const topicArn = process.env.ORDER_NOTIFICATIONS_TOPIC_ARN;

  if (!topicArn) {
    throw new Error("ORDER_NOTIFICATIONS_TOPIC_ARN is required");
  }

  return topicArn;
}

function formatCurrency(value?: number) {
  if (typeof value !== "number") {
    return "unknown";
  }

  return `${value.toLocaleString("ja-JP")}円`;
}

function buildMessage(
  event: EventBridgeOrderEvent<NotificationDetail>
): NotificationPayload {
  // detail-type ごとに本文を変えて、受信側で意味が一目で分かるようにする。
  const detailType = event["detail-type"];
  const detail = event.detail ?? {};
  const orderId = detail.orderId ?? "unknown";
  const eventId = detail.eventId ?? event.id ?? "unknown";
  const occurredAt = detail.updatedAt ?? detail.deletedAt ?? event.time ?? "unknown";

  switch (detailType) {
    case "OrderCreated":
      return {
        detailType,
        message: [
          "注文が登録されました",
          `注文ID: ${orderId}`,
          `顧客名: ${detail.customerName ?? "unknown"}`,
          `メールアドレス: ${detail.customerEmail ?? "unknown"}`,
          `合計金額: ${formatCurrency(detail.totalAmount)}`,
          `ステータス: ${detail.status ?? "unknown"}`,
          `イベントID: ${eventId}`,
          `発生時刻: ${occurredAt}`,
        ].join("\n"),
        orderId,
        subject: `OrderCreated: ${orderId}`,
      };
    case "OrderUpdated":
      return {
        detailType,
        message: [
          "注文が更新されました",
          `注文ID: ${orderId}`,
          `顧客名: ${detail.customerName ?? "unknown"}`,
          `メールアドレス: ${detail.customerEmail ?? "unknown"}`,
          `合計金額: ${formatCurrency(detail.totalAmount)}`,
          `ステータス: ${detail.status ?? "unknown"}`,
          `イベントID: ${eventId}`,
          `発生時刻: ${occurredAt}`,
        ].join("\n"),
        orderId,
        subject: `OrderUpdated: ${orderId}`,
      };
    case "OrderDeleted":
      return {
        detailType,
        message: [
          "注文が削除されました",
          `注文ID: ${orderId}`,
          `イベントID: ${eventId}`,
          `削除時刻: ${detail.deletedAt ?? occurredAt}`,
        ].join("\n"),
        orderId,
        subject: `OrderDeleted: ${orderId}`,
      };
    case "OrderStatusChanged":
      return {
        detailType,
        message: [
          "注文ステータスが更新されました",
          `注文ID: ${orderId}`,
          `ステータス: ${detail.status ?? "unknown"}`,
          `イベントID: ${eventId}`,
          `発生時刻: ${occurredAt}`,
        ].join("\n"),
        orderId,
        subject: `OrderStatusChanged: ${orderId}`,
      };
    default:
      return {
        detailType,
        message: [
          "注文イベントを受信しました",
          `イベント種別: ${detailType}`,
          `注文ID: ${orderId}`,
          `イベントID: ${eventId}`,
          `発生時刻: ${occurredAt}`,
        ].join("\n"),
        orderId,
        subject: `${detailType}: ${orderId}`,
      };
  }
}

export async function handler(
  event: EventBridgeOrderEvent<NotificationDetail>
): Promise<{ ok: true }> {
  // TopicArn は環境変数で受け取り、実装とデプロイ先を分離する。
  const topicArn = assertTopicArn();
  const payload = buildMessage(event);

  await snsClient.send(
    new PublishCommand({
      Message: payload.message,
      Subject: payload.subject.slice(0, 100),
      TopicArn: topicArn,
    })
  );

  console.log("Notification sent", {
    detailType: payload.detailType,
    orderId: payload.orderId,
  });

  return {
    ok: true,
  };
}
