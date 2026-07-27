import "server-only";

import type { RestaurantOrder } from "@/features/admin/types";

export type NotificationEvent =
  | "order_created"
  | "order_accepted"
  | "order_declined"
  | "order_ready"
  | "order_completed"
  | "order_cancelled";

export type NotificationRecord = {
  id: string;
  orderId: string;
  event: NotificationEvent;
  channel: "email" | "sms";
  recipient: string;
  status: "pending" | "sent" | "failed";
  createdAt: string;
  sentAt?: string;
};

const globalNotifications = globalThis as typeof globalThis & {
  __foodappNotifications?: NotificationRecord[];
};

function outbox() {
  globalNotifications.__foodappNotifications ??= [];
  return globalNotifications.__foodappNotifications;
}

function recipientFor(order: RestaurantOrder) {
  if (order.preferredChannel === "sms" && order.customerPhone) {
    return { channel: "sms" as const, recipient: order.customerPhone };
  }
  if (order.customerEmail) {
    return { channel: "email" as const, recipient: order.customerEmail };
  }
  if (order.customerPhone) {
    return { channel: "sms" as const, recipient: order.customerPhone };
  }
  return null;
}

export function enqueueOrderNotification(
  order: RestaurantOrder,
  event: NotificationEvent,
) {
  const destination = recipientFor(order);
  if (!destination) return;
  const record: NotificationRecord = {
    id: crypto.randomUUID(),
    orderId: order.id,
    event,
    ...destination,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  outbox().push(record);
}

export function getNotificationOutbox(orderId?: string) {
  return outbox().filter((record) => !orderId || record.orderId === orderId);
}
