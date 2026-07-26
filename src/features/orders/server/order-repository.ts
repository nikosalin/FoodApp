import "server-only";

import { seedAdminState } from "@/features/admin/data/seed";
import type {
  OrderInput,
  OrderStatus,
  RestaurantOrder,
} from "@/features/admin/types";
import {
  enqueueOrderNotification,
  type NotificationEvent,
} from "./notifications";

type OrderEvent = {
  restaurantId: string;
  type: "changed";
};

type OrderMemory = {
  orders: RestaurantOrder[];
  listeners: Set<(event: OrderEvent) => void>;
};

const globalOrderMemory = globalThis as typeof globalThis & {
  __foodappOrderMemory?: OrderMemory;
};

function memory(): OrderMemory {
  globalOrderMemory.__foodappOrderMemory ??= {
    orders: structuredClone(seedAdminState.orders),
    listeners: new Set(),
  };
  return globalOrderMemory.__foodappOrderMemory;
}

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted", "rejected"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export class OrderRepositoryError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function getOrdersForRestaurant(restaurantId: string) {
  return memory()
    .orders.filter((order) => order.restaurantId === restaurantId)
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    );
}

function orderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomUUID()
    .slice(0, 4)
    .toUpperCase()}`;
}

export function createOrder(
  input: OrderInput,
  options?: { contactVerified?: boolean },
) {
  const now = new Date().toISOString();
  const order: RestaurantOrder = {
    id: crypto.randomUUID(),
    restaurantId: input.restaurantId,
    orderNumber: orderNumber(),
    orderType: input.orderType,
    deliveryAddress: input.deliveryAddress
      ? structuredClone(input.deliveryAddress)
      : undefined,
    tableNumber: input.tableNumber?.trim() || undefined,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail?.trim().toLowerCase() || undefined,
    customerPhone: input.customerPhone?.trim() || undefined,
    preferredChannel: input.preferredChannel,
    paymentMethod: input.paymentMethod,
    contactVerified: options?.contactVerified ?? false,
    trackingToken: crypto.randomUUID().replaceAll("-", ""),
    notificationStatus: "pending",
    items: structuredClone(input.items),
    total: input.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    ),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  memory().orders.unshift(order);
  enqueueOrderNotification(order, "order_created");
  emitChange(input.restaurantId);
  return order;
}

export function getOrderByTrackingToken(trackingToken: string) {
  return memory().orders.find(
    (order) => order.trackingToken === trackingToken,
  );
}

export function attachOrderPayment(
  restaurantId: string,
  orderId: string,
  payment: { id: string; status: RestaurantOrder["paymentStatus"] },
) {
  const order = memory().orders.find(
    (candidate) =>
      candidate.id === orderId && candidate.restaurantId === restaurantId,
  );
  if (!order) throw new OrderRepositoryError("Order not found", 404);
  order.paymentId = payment.id;
  order.paymentStatus = payment.status;
  order.updatedAt = new Date().toISOString();
  emitChange(restaurantId);
  return order;
}

export function getOrder(restaurantId: string, orderId: string) {
  const order = memory().orders.find(
    (candidate) =>
      candidate.id === orderId && candidate.restaurantId === restaurantId,
  );
  if (!order) throw new OrderRepositoryError("Order not found", 404);
  return order;
}

export function updateOrderDetails(
  restaurantId: string,
  orderId: string,
  input: Omit<OrderInput, "restaurantId">,
) {
  const store = memory();
  const index = store.orders.findIndex(
    (order) => order.id === orderId && order.restaurantId === restaurantId,
  );
  if (index < 0) throw new OrderRepositoryError("Order not found", 404);
  const current = store.orders[index];
  if (["completed", "cancelled", "rejected"].includes(current.status)) {
    throw new OrderRepositoryError("Closed orders cannot be edited", 409);
  }
  const updated: RestaurantOrder = {
    ...current,
    orderType: input.orderType,
    deliveryAddress: input.deliveryAddress
      ? structuredClone(input.deliveryAddress)
      : undefined,
    tableNumber: input.tableNumber?.trim() || undefined,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail?.trim().toLowerCase() || undefined,
    customerPhone: input.customerPhone?.trim() || undefined,
    preferredChannel: input.preferredChannel,
    paymentMethod: input.paymentMethod,
    items: structuredClone(input.items),
    total: input.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    ),
    updatedAt: new Date().toISOString(),
  };
  store.orders[index] = updated;
  emitChange(restaurantId);
  return updated;
}

export function deleteOrder(restaurantId: string, orderId: string) {
  const store = memory();
  const index = store.orders.findIndex(
    (order) => order.id === orderId && order.restaurantId === restaurantId,
  );
  if (index < 0) throw new OrderRepositoryError("Order not found", 404);
  const [deleted] = store.orders.splice(index, 1);
  emitChange(restaurantId);
  return deleted;
}

export function updateOrderStatus(input: {
  restaurantId: string;
  orderId: string;
  status: OrderStatus;
  rejectionReason?: string;
}) {
  const store = memory();
  const index = store.orders.findIndex(
    (order) =>
      order.id === input.orderId &&
      order.restaurantId === input.restaurantId,
  );
  if (index < 0) throw new OrderRepositoryError("Order not found", 404);

  const current = store.orders[index];
  if (!allowedTransitions[current.status].includes(input.status)) {
    throw new OrderRepositoryError(
      `Cannot change an order from ${current.status} to ${input.status}`,
      409,
    );
  }
  if (
    input.status === "rejected" &&
    (!input.rejectionReason || input.rejectionReason.trim().length < 3)
  ) {
    throw new OrderRepositoryError(
      "A rejection reason of at least 3 characters is required",
      400,
    );
  }

  const now = new Date().toISOString();
  const updated: RestaurantOrder = {
    ...current,
    status: input.status,
    rejectionReason:
      input.status === "rejected"
        ? input.rejectionReason?.trim()
        : current.rejectionReason,
    closedAt: ["completed", "cancelled", "rejected"].includes(input.status)
      ? now
      : current.closedAt,
    updatedAt: now,
  };
  store.orders[index] = updated;
  const notificationEvents: Partial<Record<OrderStatus, NotificationEvent>> = {
    accepted: "order_accepted",
    rejected: "order_declined",
    ready: "order_ready",
    completed: "order_completed",
    cancelled: "order_cancelled",
  };
  const notificationEvent = notificationEvents[input.status];
  if (notificationEvent) enqueueOrderNotification(updated, notificationEvent);
  emitChange(input.restaurantId);
  return updated;
}

function emitChange(restaurantId: string) {
  for (const listener of memory().listeners) {
    listener({ restaurantId, type: "changed" });
  }
}

export function subscribeToOrderEvents(
  listener: (event: OrderEvent) => void,
) {
  memory().listeners.add(listener);
  return () => memory().listeners.delete(listener);
}
