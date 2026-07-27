import "server-only";

import type {
  PaymentRecord,
  PaymentStatus,
  ProviderWebhookUpdate,
} from "../types";
import { PaymentError } from "./errors";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";
import { databaseRestaurantId } from "@/features/orders/server/supabase-order-repository";
import type { Database, TableRow } from "@/types/database";

type DatabasePaymentRow = TableRow<"payments">;
type DatabasePaymentUpdate =
  Database["public"]["Tables"]["payments"]["Update"];

const businessIds: Record<string, string> = {
  "business-1": "10000000-0000-4000-8000-000000000001",
  "business-2": "10000000-0000-4000-8000-000000000002",
};

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

export async function createPendingPayment(
  input: Omit<
    PaymentRecord,
    "id" | "status" | "createdAt" | "updatedAt"
  >,
) {
  if (isSupabaseConfigured()) {
    const client = requireSupabase();
    const businessId = databaseBusinessId(input.businessId);
    const existing = await client
      .from("payments")
      .select("*")
      .eq("business_id", businessId)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing.error) throw persistenceError(existing.error.message);
    if (existing.data) return mapPayment(existing.data, input.restaurantId);
    const inserted = await client
      .from("payments")
      .insert({
        order_id: input.orderId,
        business_id: businessId,
        provider: input.provider,
        method: databasePaymentMethod(input.method),
        amount_minor: input.amountMinor,
        currency: input.currency,
        idempotency_key: input.idempotencyKey,
      })
      .select("*")
      .single();
    if (inserted.error) throw persistenceError(inserted.error.message);
    return mapPayment(inserted.data, input.restaurantId);
  }
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

export async function attachProviderPayment(
  paymentId: string,
  providerPaymentId: string,
  status: PaymentStatus,
) {
  if (isSupabaseConfigured()) {
    return updateSupabasePayment(paymentId, {
      provider_payment_id: providerPaymentId,
      status,
      ...statusTimestamps(status),
    });
  }
  const payment = await getPayment(paymentId);
  payment.providerPaymentId = providerPaymentId;
  applyStatus(payment, status);
  return payment;
}

export async function attachProviderAuthorization(
  paymentId: string,
  providerAuthorizationId: string,
) {
  if (isSupabaseConfigured()) {
    return updateSupabasePayment(paymentId, {
      provider_authorization_id: providerAuthorizationId,
      status: "authorized",
      authorized_at: new Date().toISOString(),
    });
  }
  const payment = await getPayment(paymentId);
  payment.providerAuthorizationId = providerAuthorizationId;
  applyStatus(payment, "authorized");
  return payment;
}

export async function getPayment(paymentId: string) {
  if (isSupabaseConfigured()) {
    const client = requireSupabase();
    const result = await client
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();
    if (result.error) throw persistenceError(result.error.message);
    if (!result.data) {
      throw new PaymentError("Payment not found", 404, "payment_not_found");
    }
    return mapPaymentWithRestaurant(result.data);
  }
  const payment = memory().payments.find((candidate) => candidate.id === paymentId);
  if (!payment) throw new PaymentError("Payment not found", 404, "payment_not_found");
  return payment;
}

export async function getPaymentForOrder(orderId: string) {
  if (isSupabaseConfigured()) {
    const client = requireSupabase();
    const result = await client
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();
    if (result.error) throw persistenceError(result.error.message);
    return result.data ? mapPaymentWithRestaurant(result.data) : undefined;
  }
  return memory().payments.find((payment) => payment.orderId === orderId);
}

export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
) {
  if (isSupabaseConfigured()) {
    return updateSupabasePayment(paymentId, {
      status,
      ...statusTimestamps(status),
    });
  }
  const payment = await getPayment(paymentId);
  applyStatus(payment, status);
  return payment;
}

export async function applyWebhookUpdate(update: ProviderWebhookUpdate) {
  if (isSupabaseConfigured()) {
    return applySupabaseWebhookUpdate(update);
  }
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

export async function recordPaymentAudit(
  paymentId: string,
  actorUserId: string,
  action: string,
) {
  if (!isSupabaseConfigured()) return;
  const client = requireSupabase();
  const payment = await client
    .from("payments")
    .select("id, business_id, order_id, status")
    .eq("id", paymentId)
    .maybeSingle();
  if (payment.error || !payment.data) {
    throw persistenceError(payment.error?.message ?? "Payment is missing");
  }
  const order = await client
    .from("orders")
    .select("restaurant_id")
    .eq("id", payment.data.order_id)
    .maybeSingle();
  if (order.error || !order.data) {
    throw persistenceError(order.error?.message ?? "Payment order is missing");
  }
  const audit = await client.from("audit_events").insert({
    business_id: payment.data.business_id,
    restaurant_id: order.data.restaurant_id,
    actor_user_id: actorUserId,
    action,
    entity_type: "payment",
    entity_id: paymentId,
    safe_changes: { status: payment.data.status },
  });
  if (audit.error) throw persistenceError(audit.error.message);
}

async function updateSupabasePayment(
  paymentId: string,
  changes: DatabasePaymentUpdate,
) {
  const client = requireSupabase();
  const result = await client
    .from("payments")
    .update(changes)
    .eq("id", paymentId)
    .select("*")
    .maybeSingle();
  if (result.error) throw persistenceError(result.error.message);
  if (!result.data) {
    throw new PaymentError("Payment not found", 404, "payment_not_found");
  }
  return mapPaymentWithRestaurant(result.data);
}

async function applySupabaseWebhookUpdate(update: ProviderWebhookUpdate) {
  const client = requireSupabase();
  const paymentResult = await client
    .from("payments")
    .select("*")
    .eq("provider_payment_id", update.providerPaymentId)
    .maybeSingle();
  if (paymentResult.error) throw persistenceError(paymentResult.error.message);
  const payment = paymentResult.data;
  const event = await client
    .from("payment_events")
    .insert({
      payment_id: payment?.id ?? null,
      provider: update.eventId.startsWith("paypal:") ? "paypal" : "stripe",
      provider_event_id: update.eventId,
      event_type: update.status ?? "ignored",
      status: update.status ?? null,
      failure_code: update.failureCode ?? null,
      processed_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  if (event.error?.code === "23505") {
    return { duplicate: true, payment: undefined };
  }
  if (event.error) throw persistenceError(event.error.message);
  if (!payment || !update.status) {
    return { duplicate: false, payment: undefined };
  }
  const updated = await updateSupabasePayment(payment.id, {
    status: update.status,
    failure_code: update.failureCode ?? null,
    provider_authorization_id:
      update.providerAuthorizationId ?? payment.provider_authorization_id,
    ...statusTimestamps(update.status),
  });
  return { duplicate: false, payment: updated };
}

async function mapPaymentWithRestaurant(
  row: DatabasePaymentRow,
): Promise<PaymentRecord> {
  const client = requireSupabase();
  const order = await client
    .from("orders")
    .select("restaurant_id")
    .eq("id", row.order_id)
    .maybeSingle();
  if (order.error || !order.data) {
    throw persistenceError(order.error?.message ?? "Payment order is missing");
  }
  return mapPayment(row, applicationRestaurantId(order.data.restaurant_id));
}

function mapPayment(
  row: DatabasePaymentRow,
  restaurantId: string,
): PaymentRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    businessId: applicationBusinessId(row.business_id),
    restaurantId,
    provider: row.provider,
    method: applicationPaymentMethod(row.method),
    providerPaymentId: row.provider_payment_id ?? undefined,
    providerAuthorizationId: row.provider_authorization_id ?? undefined,
    amountMinor: row.amount_minor,
    currency: row.currency,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorizedAt: row.authorized_at ?? undefined,
    capturedAt: row.captured_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    refundedAt: row.refunded_at ?? undefined,
    failureCode: row.failure_code ?? undefined,
  };
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

function databaseBusinessId(value: string) {
  return businessIds[value] ?? value;
}

function applicationBusinessId(value: string) {
  return (
    Object.entries(businessIds).find(([, databaseId]) => databaseId === value)?.[0] ??
    value
  );
}

function applicationRestaurantId(value: string) {
  for (const candidate of ["restaurant-1", "restaurant-2"]) {
    if (databaseRestaurantId(candidate) === value) return candidate;
  }
  return value;
}

function databasePaymentMethod(
  value: PaymentRecord["method"],
): Database["public"]["Enums"]["payment_method"] {
  return value === "cash" ? "cash_on_site" : value;
}

function applicationPaymentMethod(
  value: Database["public"]["Enums"]["payment_method"],
): PaymentRecord["method"] {
  return value === "cash_on_site" ? "cash" : value;
}

function statusTimestamps(status: PaymentStatus): DatabasePaymentUpdate {
  const now = new Date().toISOString();
  if (status === "authorized") return { authorized_at: now };
  if (status === "captured") return { captured_at: now };
  if (status === "cancelled") return { cancelled_at: now };
  if (status === "refunded") return { refunded_at: now };
  return {};
}

function requireSupabase() {
  const client = getAdminSupabase();
  if (!client) {
    throw new PaymentError(
      "Payment persistence is unavailable",
      503,
      "payment_persistence_unavailable",
    );
  }
  return client;
}

function persistenceError(message: string) {
  return new PaymentError(
    `Payment persistence failed: ${message}`,
    503,
    "payment_persistence_failed",
  );
}
