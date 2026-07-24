import "server-only";

import type { RestaurantOrder } from "@/features/admin/types";

type IdempotentResult = {
  order: RestaurantOrder;
  expiresAt: number;
};

const globalGuestOrders = globalThis as typeof globalThis & {
  __foodappGuestIdempotency?: Map<string, IdempotentResult>;
  __foodappGuestAttempts?: Map<string, { count: number; resetAt: number }>;
};

const idempotency =
  globalGuestOrders.__foodappGuestIdempotency ??
  (globalGuestOrders.__foodappGuestIdempotency = new Map());
const attempts =
  globalGuestOrders.__foodappGuestAttempts ??
  (globalGuestOrders.__foodappGuestAttempts = new Map());

export function getIdempotentOrder(key: string) {
  const result = idempotency.get(key);
  if (!result || result.expiresAt <= Date.now()) {
    idempotency.delete(key);
    return null;
  }
  return result.order;
}

export function rememberIdempotentOrder(
  key: string,
  order: RestaurantOrder,
) {
  idempotency.set(key, {
    order,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
}

export function allowGuestOrder(clientKey: string) {
  const now = Date.now();
  const current = attempts.get(clientKey);
  if (!current || current.resetAt <= now) {
    attempts.set(clientKey, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (current.count >= 30) return false;
  current.count += 1;
  return true;
}
