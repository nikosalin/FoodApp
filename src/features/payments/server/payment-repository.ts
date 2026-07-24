import "server-only";

import type {
  PaymentRecord,
  PaymentStatus,
  ProviderWebhookUpdate,
} from "../types";
import { PaymentError } from "./errors";

type PaymentMemory = {
  payments: PaymentRecord[];
  processedWebhookEvents: Set<string>;
};

const globalPaymentMemory = globalThis as typeof globalThis & {
  __foodappPaymentMemory?: PaymentMemory;
};

function memory(): PaymentMemory {
  globalPaymentMemory.__foodappPaymentMemory ??= {
    payments: [],
    processedWebhookEvents: new Set(),
  };
  return globalPaymentMemory.__foodappPaymentMemory;
}

export function createPendingPayment(
  input: Omit<
    PaymentRecord,
    "id" | "status" | "createdAt" | "updatedAt"
  >,
) {
  const existing = memory().payments.find(
    (payment) =>
      payment.businessId === input.businessId &&
      payment.idempotencyKey === input.idempotencyKey,
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const payment: PaymentRecord = {
    ...input,
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  memory().payments.push(payment);
  return payment;
}

export function attachProviderPayment(
  paymentId: string,
  providerPaymentId: string,
  status: PaymentStatus,
) {
  const payment = getPayment(paymentId);
  payment.providerPaymentId = providerPaymentId;
  applyStatus(payment, status);
  return payment;
}

export function attachProviderAuthorization(
  paymentId: string,
  providerAuthorizationId: string,
) {
  const payment = getPayment(paymentId);
  payment.providerAuthorizationId = providerAuthorizationId;
  applyStatus(payment, "authorized");
  return payment;
}

export function getPayment(paymentId: string) {
  const payment = memory().payments.find((candidate) => candidate.id === paymentId);
  if (!payment) throw new PaymentError("Payment not found", 404, "payment_not_found");
  return payment;
}

export function getPaymentForOrder(orderId: string) {
  return memory().payments.find((payment) => payment.orderId === orderId);
}

export function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
) {
  const payment = getPayment(paymentId);
  applyStatus(payment, status);
  return payment;
}

export function applyWebhookUpdate(update: ProviderWebhookUpdate) {
  const eventKey = `${update.eventId}`;
  if (memory().processedWebhookEvents.has(eventKey)) {
    return { duplicate: true, payment: undefined };
  }

  const payment = memory().payments.find(
    (candidate) =>
      candidate.providerPaymentId === update.providerPaymentId &&
      (!update.businessId || candidate.businessId === update.businessId),
  );
  memory().processedWebhookEvents.add(eventKey);
  if (!payment || !update.status) {
    return { duplicate: false, payment };
  }

  payment.failureCode = update.failureCode;
  if (update.providerAuthorizationId) {
    payment.providerAuthorizationId = update.providerAuthorizationId;
  }
  applyStatus(payment, update.status);
  return { duplicate: false, payment };
}

function applyStatus(payment: PaymentRecord, status: PaymentStatus) {
  const now = new Date().toISOString();
  payment.status = status;
  payment.updatedAt = now;
  if (status === "authorized") payment.authorizedAt = now;
  if (status === "captured") payment.capturedAt = now;
  if (status === "cancelled") payment.cancelledAt = now;
  if (status === "refunded") payment.refundedAt = now;
}
