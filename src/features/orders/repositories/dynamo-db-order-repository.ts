// DynamoDB の item 形状とドメイン型の差を、このリポジトリ内で吸収する。
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
} from "@/features/orders/types/order";
import { orderStatuses, paymentMethods } from "@/features/orders/types/order";

import type {
  OrderQueryFilters,
  OrderRepository,
} from "@/features/orders/repositories/order-repository";
import { buildOrderId } from "@/features/orders/utils/order-id";
import {
  getAwsRegion,
  getOrdersTableName,
} from "@/lib/runtime-config.server";

type DynamoDbOrderItem = {
  customerEmail?: string;
  customerName?: string;
  id?: string;
  items?: OrderItem[];
  orderedAt?: string;
  orderId?: string;
  paymentMethod?: PaymentMethod;
  shippingAddress?: string;
  status?: OrderStatus;
  totalAmount?: number;
};

const documentClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: getAwsRegion(),
  })
);

function assertTableName() {
  // テーブル名が未設定なら、DynamoDB 実装としては続行できない。
  return getOrdersTableName();
}

function calculateTotalAmount(items: OrderItem[]) {
  return items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return paymentMethods.includes(value as PaymentMethod);
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return orderStatuses.includes(value as OrderStatus);
}

function normalizeItems(value: unknown): OrderItem[] {
  return Array.isArray(value) ? (value as OrderItem[]) : [];
}

function toOrder(item?: DynamoDbOrderItem): Order | undefined {
  // 壊れた item を無理やり Order にせず、一覧表示から自然に落とす。
  if (!item?.orderId && !item?.id) {
    return undefined;
  }

  const paymentMethod = isPaymentMethod(item.paymentMethod)
    ? item.paymentMethod
    : "credit-card";
  const status = isOrderStatus(item.status) ? item.status : "pending";

  return {
    id: item.id ?? item.orderId ?? "",
    orderedAt: item.orderedAt ?? new Date().toISOString(),
    customerName: item.customerName ?? "",
    customerEmail: item.customerEmail ?? "",
    shippingAddress: item.shippingAddress ?? "",
    status,
    paymentMethod,
    items: normalizeItems(item.items),
    totalAmount: item.totalAmount ?? 0,
  };
}

function matchesFilters(order: Order, filters: OrderQueryFilters = {}) {
  // 初期構成では Scan ベースで検索し、将来 Query/GSI に置き換えやすい形にしておく。
  const normalizedQuery = filters.query?.trim().toLowerCase();
  const matchesStatus = !filters.status || order.status === filters.status;
  const matchesPayment =
    !filters.paymentMethod || order.paymentMethod === filters.paymentMethod;
  const searchableText = [
    order.id,
    order.customerName,
    order.customerEmail,
    order.shippingAddress,
    ...order.items.map((item) => item.productName),
  ]
    .join(" ")
    .toLowerCase();
  const matchesQuery =
    !normalizedQuery || searchableText.includes(normalizedQuery);

  return matchesStatus && matchesPayment && matchesQuery;
}

function isConditionalCheckFailed(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "ConditionalCheckFailedException"
  );
}

export const dynamoDbOrderRepository: OrderRepository = {
  async create(values) {
    // サーバー側で採番と集計を行い、その結果をそのまま保存する。
    const orderedAt = new Date().toISOString();
    const id = buildOrderId(orderedAt);
    const totalAmount = calculateTotalAmount(values.items);
    const order: Order = {
      id,
      orderedAt,
      customerName: values.customerName,
      customerEmail: values.customerEmail,
      shippingAddress: values.shippingAddress,
      status: "pending",
      paymentMethod: values.paymentMethod,
      items: values.items,
      totalAmount,
    };

    await documentClient.send(
      new PutCommand({
        TableName: assertTableName(),
        Item: {
          ...order,
          orderId: order.id,
        },
      })
    );

    return order;
  },

  async delete(id) {
    // 先に存在確認し、対象がなければ削除しない。
    const currentOrder = await this.getById(id);

    if (!currentOrder) {
      return false;
    }

    await documentClient.send(
      new DeleteCommand({
        TableName: assertTableName(),
        Key: {
          orderId: id,
        },
      })
    );

    return true;
  },

  async getById(id) {
    // 1件取得は PK で直接読む。
    const result = await documentClient.send(
      new GetCommand({
        TableName: assertTableName(),
        Key: {
          orderId: id,
        },
      })
    );

    return toOrder(result.Item as DynamoDbOrderItem | undefined);
  },

  async list(filters) {
    // 件数増加時は Query へ移行する前提で、今は一覧を単純に Scan する。
    const result = await documentClient.send(
      new ScanCommand({
        TableName: assertTableName(),
      })
    );
    const orders =
      result.Items?.map((item) => toOrder(item as DynamoDbOrderItem)).filter(
        (order): order is Order => !!order
      ) ?? [];

    return orders
      .filter((order) => matchesFilters(order, filters))
      .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt));
  },

  async update(id, values) {
    // 条件付き更新で、存在しない注文の上書きを防ぐ。
    const totalAmount = calculateTotalAmount(values.items);

    try {
      const result = await documentClient.send(
        new UpdateCommand({
          TableName: assertTableName(),
          Key: {
            orderId: id,
          },
          ConditionExpression: "attribute_exists(orderId)",
          UpdateExpression:
            "SET customerName = :customerName, customerEmail = :customerEmail, shippingAddress = :shippingAddress, paymentMethod = :paymentMethod, items = :items, totalAmount = :totalAmount",
          ExpressionAttributeValues: {
            ":customerName": values.customerName,
            ":customerEmail": values.customerEmail,
            ":shippingAddress": values.shippingAddress,
            ":paymentMethod": values.paymentMethod,
            ":items": values.items,
            ":totalAmount": totalAmount,
          },
          ReturnValues: "ALL_NEW",
        })
      );

      return toOrder(result.Attributes as DynamoDbOrderItem | undefined);
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        return undefined;
      }

      throw error;
    }
  },

  async updateStatus(id, status) {
    // ステータスだけを更新し、他の属性はそのまま残す。
    try {
      const result = await documentClient.send(
        new UpdateCommand({
          TableName: assertTableName(),
          Key: {
            orderId: id,
          },
          ConditionExpression: "attribute_exists(orderId)",
          UpdateExpression: "SET #status = :status",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":status": status,
          },
          ReturnValues: "ALL_NEW",
        })
      );

      return toOrder(result.Attributes as DynamoDbOrderItem | undefined);
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        return undefined;
      }

      throw error;
    }
  },
};
