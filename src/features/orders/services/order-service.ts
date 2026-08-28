import type { OrderFormValues } from "@/features/orders/schemas/order-schema";
import type { Order, OrderStatus } from "@/features/orders/types/order";

import { dynamoDbOrderRepository } from "@/features/orders/repositories/dynamo-db-order-repository";
import type { OrderQueryFilters } from "@/features/orders/repositories/order-repository";

export async function getOrders() {
  return dynamoDbOrderRepository.list();
}

export async function searchOrders(filters: OrderQueryFilters) {
  return dynamoDbOrderRepository.list(filters);
}

export async function getOrderById(id: string) {
  return dynamoDbOrderRepository.getById(id);
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  return dynamoDbOrderRepository.updateStatus(id, status);
}

export async function updateOrder(
  id: string,
  values: OrderFormValues
): Promise<Order | undefined> {
  return dynamoDbOrderRepository.update(id, values);
}

export async function deleteOrder(id: string) {
  return dynamoDbOrderRepository.delete(id);
}

export async function createOrder(values: OrderFormValues) {
  return dynamoDbOrderRepository.create(values);
}
