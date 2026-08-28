import { randomUUID } from "crypto";

import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

import type { Order } from "@/features/orders/types/order";

// 注文の保存結果を EventBridge へ流し、通知や後続処理の起点にする。
const eventBridgeClient = new EventBridgeClient({
  region: process.env.AWS_REGION ?? "ap-northeast-1",
});

type OrderCreatedEventDetail = {
  createdAt: string;
  customerEmail: string;
  customerName: string;
  eventId: string;
  orderId: string;
  paymentMethod: Order["paymentMethod"];
  shippingAddress: string;
  status: Order["status"];
  totalAmount: number;
  updatedAt: string;
  version: number;
};

type OrderUpdatedEventDetail = OrderCreatedEventDetail;

type OrderDeletedEventDetail = {
  deletedAt: string;
  eventId: string;
  orderId: string;
  version: number;
};

type OrderStatusChangedEventDetail = {
  eventId: string;
  orderId: string;
  status: Order["status"];
  updatedAt: string;
  version: number;
};

function buildCreatedEventDetail(order: Order): OrderCreatedEventDetail {
  // 登録時点の注文状態をスナップショットとして送る。
  return {
    createdAt: order.orderedAt,
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    eventId: randomUUID(),
    orderId: order.id,
    paymentMethod: order.paymentMethod,
    shippingAddress: order.shippingAddress,
    status: order.status,
    totalAmount: order.totalAmount,
    updatedAt: order.orderedAt,
    version: 1,
  };
}

function buildUpdatedEventDetail(order: Order): OrderUpdatedEventDetail {
  // 更新イベントも、受信側が再表示しやすいよう完全スナップショットで送る。
  return buildCreatedEventDetail(order);
}

function buildDeletedEventDetail(
  orderId: string,
  deletedAt: string
): OrderDeletedEventDetail {
  return {
    deletedAt,
    eventId: randomUUID(),
    orderId,
    version: 1,
  };
}

function buildStatusChangedEventDetail(
  order: Order
): OrderStatusChangedEventDetail {
  return {
    eventId: randomUUID(),
    orderId: order.id,
    status: order.status,
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

async function publishEvent(detailType: string, detail: unknown) {
  // イベントバス名は環境変数で与え、送信先をコードから切り離す。
  const eventBusName = process.env.ORDER_EVENTS_BUS_NAME;

  if (!eventBusName) {
    throw new Error("ORDER_EVENTS_BUS_NAME is required");
  }

  await eventBridgeClient.send(
    new PutEventsCommand({
      Entries: [
        {
          Detail: JSON.stringify(detail),
          DetailType: detailType,
          EventBusName: eventBusName,
          Source: "oms.orders",
        },
      ],
    })
  );
}

export async function publishOrderCreated(order: Order) {
  return publishEvent("OrderCreated", buildCreatedEventDetail(order));
}

export async function publishOrderUpdated(order: Order) {
  return publishEvent("OrderUpdated", buildUpdatedEventDetail(order));
}

export async function publishOrderDeleted(orderId: string) {
  return publishEvent(
    "OrderDeleted",
    buildDeletedEventDetail(orderId, new Date().toISOString())
  );
}

export async function publishOrderStatusChanged(order: Order) {
  return publishEvent(
    "OrderStatusChanged",
    buildStatusChangedEventDetail(order)
  );
}
