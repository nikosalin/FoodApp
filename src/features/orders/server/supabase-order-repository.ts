import "server-only";

import { createHash } from "node:crypto";
import type {
  DeletedRestaurantOrder,
  OrderInput,
  OrderHistoryEvent,
  OrderStatus,
  RestaurantOrder,
} from "@/features/admin/types";
import type { Json, TableRow } from "@/types/database";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { OrderRepositoryError } from "./order-repository";

const restaurantIds: Record<string, string> = {
  "restaurant-1": "20000000-0000-4000-8000-000000000001",
  "restaurant-2": "20000000-0000-4000-8000-000000000002",
};

const legacyRestaurantIds = Object.fromEntries(
  Object.entries(restaurantIds).map(([legacyId, databaseId]) => [
    databaseId,
    legacyId,
  ]),
);

export function databaseRestaurantId(restaurantId: string) {
  return restaurantIds[restaurantId] ?? restaurantId;
}

export async function getOrdersForRestaurantFromSupabase(
  restaurantId: string,
) {
  const client = requireAdminClient();
  const databaseId = databaseRestaurantId(restaurantId);
  const { data: orders, error } = await client
    .from("orders")
    .select("*")
    .eq("restaurant_id", databaseId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw repositoryError(error.message);
  if (orders.length === 0) return [];

  const { data: items, error: itemsError } = await client
    .from("order_items")
    .select("*")
    .in(
      "order_id",
      orders.map((order) => order.id),
    );
  if (itemsError) throw repositoryError(itemsError.message);
  const { data: payments, error: paymentsError } = await client
    .from("payments")
    .select("id, order_id, status")
    .in(
      "order_id",
      orders.map((order) => order.id),
    );
  if (paymentsError) throw repositoryError(paymentsError.message);
  const paymentByOrder = new Map(
    payments.map((payment) => [payment.order_id, payment]),
  );

  const itemsByOrder = new Map<string, TableRow<"order_items">[]>();
  for (const item of items) {
    const orderItems = itemsByOrder.get(item.order_id) ?? [];
    orderItems.push(item);
    itemsByOrder.set(item.order_id, orderItems);
  }
  return orders.map((order) =>
    mapOrder(
      order,
      itemsByOrder.get(order.id) ?? [],
      paymentByOrder.get(order.id),
    ),
  );
}

export async function createOrderInSupabase(
  input: OrderInput,
  options: {
    idempotencyKey: string;
    source?: "guest" | "admin" | "phone" | "walk_in";
    createdBy?: string;
  },
) {
  const client = requireAdminClient();
  const databaseId = databaseRestaurantId(input.restaurantId);
  const canonicalRequest = {
    ...input,
    restaurantId: databaseId,
    items: input.items
      .map((item) => ({
        code: item.menuItemId,
        quantity: item.quantity,
        excludedIngredients: [...(item.excludedIngredients ?? [])].sort(),
      }))
      .sort((first, second) =>
        String(first.code).localeCompare(String(second.code)),
      ),
  };
  const requestHash = createHash("sha256")
    .update(JSON.stringify(canonicalRequest))
    .digest("hex");

  const { data, error } = await client.rpc("create_order_from_menu", {
    p_restaurant_id: databaseId,
    p_order_type: input.orderType,
    p_table_number: input.tableNumber ?? null,
    p_customer_name: input.customerName,
    p_customer_email: input.customerEmail ?? null,
    p_customer_phone: input.customerPhone ?? null,
    p_delivery_address: input.deliveryAddress
      ? {
          street: input.deliveryAddress.street,
          postalCode: input.deliveryAddress.postalCode,
          city: input.deliveryAddress.city,
          countryCode: input.deliveryAddress.countryCode,
        }
      : null,
    p_customer_notes: orderNotes(input) ?? null,
    p_payment_method: databasePaymentMethod(
      input.paymentMethod,
      input.onlinePaymentProvider,
    ),
    p_items: canonicalRequest.items as Json,
    p_idempotency_key: options.idempotencyKey,
    p_request_hash: requestHash,
    p_source: options.source ?? "guest",
    p_created_by: options.createdBy ?? null,
  });
  if (error) {
    const status = error.message.includes("idempotency key reused") ? 409 : 400;
    throw new OrderRepositoryError(error.message, status);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw repositoryError("Database returned an invalid order response");
  }

  const response = data as Record<string, Json | undefined>;
  const orderId = typeof response.id === "string" ? response.id : "";
  if (input.deliveryQuote) {
    const delivery = await client.rpc("apply_delivery_quote", {
      p_order_id: orderId,
      p_restaurant_id: databaseId,
      p_delivery_zone_id: input.deliveryQuote.zoneId,
      p_distance_meters: input.deliveryQuote.distanceMeters,
      p_delivery_fee_minor: Math.round(input.deliveryQuote.deliveryFee * 100),
    });
    if (delivery.error) {
      throw repositoryError(delivery.error.message);
    }
    await recordOrderEvent({
      restaurantId: input.restaurantId,
      orderId,
      actorUserId: options.createdBy,
      eventType: "delivery.quoted",
      details: {
        distanceMeters: input.deliveryQuote.distanceMeters,
        deliveryFeeMinor: Math.round(input.deliveryQuote.deliveryFee * 100),
        zoneId: input.deliveryQuote.zoneId,
      },
    });
  }
  const order = await getOrderById(client, orderId);
  if (!order) throw repositoryError("Created order could not be loaded");
  return {
    ...order,
    trackingToken:
      typeof response.trackingToken === "string"
        ? response.trackingToken
        : undefined,
  };
}

export async function updateOrderStatusInSupabase(input: {
  restaurantId: string;
  orderId: string;
  status: OrderStatus;
  rejectionReason?: string;
  actorUserId: string;
}) {
  const client = requireAdminClient();
  const { data, error } = await client.rpc("transition_order_status", {
    p_order_id: input.orderId,
    p_restaurant_id: databaseRestaurantId(input.restaurantId),
    p_status: input.status,
    p_rejection_reason: input.rejectionReason ?? null,
    p_actor_user_id: input.actorUserId,
  });
  if (error) throw repositoryError(error.message);
  if (!data) throw new OrderRepositoryError("Order not found", 404);

  const order = await getOrderById(client, data);
  if (!order) throw new OrderRepositoryError("Order not found", 404);
  return order;
}

export async function getOrderFromSupabase(
  restaurantId: string,
  orderId: string,
) {
  const client = requireAdminClient();
  const order = await getOrderById(client, orderId);
  if (
    !order ||
    databaseRestaurantId(order.restaurantId) !==
      databaseRestaurantId(restaurantId)
  ) {
    throw new OrderRepositoryError("Order not found", 404);
  }
  return order;
}

export async function deleteOrderInSupabase(
  restaurantId: string,
  orderId: string,
  actorUserId: string,
) {
  const client = requireAdminClient();
  const existing = await client
    .from("orders")
    .select("id, business_id, restaurant_id, status")
    .eq("id", orderId)
    .eq("restaurant_id", databaseRestaurantId(restaurantId))
    .is("deleted_at", null)
    .maybeSingle();
  if (existing.error) throw repositoryError(existing.error.message);
  if (!existing.data) throw new OrderRepositoryError("Order not found", 404);
  if (existing.data.status === "accepted" || existing.data.status === "preparing") {
    throw new OrderRepositoryError(
      "Active accepted orders must be cancelled before deletion",
      409,
    );
  }
  const result = await client
    .from("orders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("restaurant_id", databaseRestaurantId(restaurantId))
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (result.error) throw repositoryError(result.error.message);
  if (!result.data) throw new OrderRepositoryError("Order not found", 404);
  const audit = await client.from("audit_events").insert({
    business_id: existing.data.business_id,
    restaurant_id: existing.data.restaurant_id,
    actor_user_id: actorUserId,
    action: "order.deleted",
    entity_type: "order",
    entity_id: orderId,
    safe_changes: { previousStatus: existing.data.status },
  });
  if (audit.error) throw repositoryError(audit.error.message);
  await insertOrderEvent({
    orderId,
    businessId: existing.data.business_id,
    restaurantId: existing.data.restaurant_id,
    actorUserId,
    eventType: "order.deleted",
    details: { previousStatus: existing.data.status },
  });
}

export async function updateOrderDetailsInSupabase(
  restaurantId: string,
  orderId: string,
  input: Omit<OrderInput, "restaurantId">,
  actorUserId: string,
) {
  const client = requireAdminClient();
  const previous = await getOrderFromSupabase(restaurantId, orderId);
  const result = await client.rpc("update_order_from_menu", {
    p_order_id: orderId,
    p_restaurant_id: databaseRestaurantId(restaurantId),
    p_order_type: input.orderType,
    p_table_number: input.tableNumber ?? null,
    p_customer_name: input.customerName,
    p_customer_email: input.customerEmail ?? null,
    p_customer_phone: input.customerPhone ?? null,
    p_delivery_address: input.deliveryAddress
      ? {
          street: input.deliveryAddress.street,
          postalCode: input.deliveryAddress.postalCode,
          city: input.deliveryAddress.city,
          countryCode: input.deliveryAddress.countryCode,
        }
      : null,
    p_payment_method: databasePaymentMethod(
      input.paymentMethod,
      input.onlinePaymentProvider,
    ),
    p_items: input.items.map((item) => ({
      code: item.menuItemId,
      quantity: item.quantity,
    })) as Json,
    p_actor_user_id: actorUserId,
  });
  if (result.error) {
    const status = result.error.message.includes("cannot be edited") ? 409 : 400;
    throw new OrderRepositoryError(result.error.message, status);
  }
  if (input.deliveryQuote) {
    const delivery = await client.rpc("apply_delivery_quote", {
      p_order_id: orderId,
      p_restaurant_id: databaseRestaurantId(restaurantId),
      p_delivery_zone_id: input.deliveryQuote.zoneId,
      p_distance_meters: input.deliveryQuote.distanceMeters,
      p_delivery_fee_minor: Math.round(input.deliveryQuote.deliveryFee * 100),
    });
    if (delivery.error) throw repositoryError(delivery.error.message);
    await recordOrderEvent({
      restaurantId,
      orderId,
      actorUserId,
      eventType: "delivery.quoted",
      details: {
        distanceMeters: input.deliveryQuote.distanceMeters,
        deliveryFeeMinor: Math.round(input.deliveryQuote.deliveryFee * 100),
        zoneId: input.deliveryQuote.zoneId,
      },
    });
  }
  const updated = await getOrderFromSupabase(restaurantId, orderId);
  const databaseOrder = await client
    .from("orders")
    .select("business_id, restaurant_id")
    .eq("id", orderId)
    .maybeSingle();
  if (databaseOrder.error || !databaseOrder.data) {
    throw repositoryError(databaseOrder.error?.message ?? "Order not found");
  }
  await insertOrderEvent({
    orderId,
    businessId: databaseOrder.data.business_id,
    restaurantId: databaseOrder.data.restaurant_id,
    actorUserId,
    eventType: "order.edited",
    details: {
      previousTotalMinor: Math.round(previous.total * 100),
      newTotalMinor: Math.round(updated.total * 100),
      previousPaymentMethod: previous.paymentMethod ?? "unknown",
      newPaymentMethod: updated.paymentMethod ?? "unknown",
      previousItemCount: previous.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      newItemCount: updated.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
    },
  });
  return updated;
}

export async function getOrderHistoryFromSupabase(
  restaurantId: string,
  orderId: string,
) {
  const client = requireAdminClient();
  const databaseId = databaseRestaurantId(restaurantId);
  const order = await client
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("restaurant_id", databaseId)
    .maybeSingle();
  if (order.error) throw repositoryError(order.error.message);
  if (!order.data) throw new OrderRepositoryError("Order not found", 404);
  const events = await client
    .from("order_events")
    .select("*")
    .eq("order_id", orderId)
    .eq("restaurant_id", databaseId)
    .order("created_at", { ascending: false });
  if (events.error) throw repositoryError(events.error.message);
  const actorIds = [
    ...new Set(
      events.data
        .map((event) => event.actor_user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const profiles =
    actorIds.length === 0
      ? { data: [], error: null }
      : await client.from("profiles").select("id, display_name").in("id", actorIds);
  if (profiles.error) throw repositoryError(profiles.error.message);
  const names = new Map(
    (profiles.data ?? []).map((profile) => [profile.id, profile.display_name]),
  );
  return events.data.map(
    (event): OrderHistoryEvent => ({
      id: event.id,
      orderId: event.order_id,
      eventType: event.event_type,
      fromStatus: event.from_status ?? undefined,
      toStatus: event.to_status ?? undefined,
      actorName: event.actor_user_id
        ? names.get(event.actor_user_id) ?? "Administrator"
        : "System",
      details: jsonDetails(event.details),
      createdAt: event.created_at,
    }),
  );
}

export async function getDeletedOrdersFromSupabase(restaurantId: string) {
  const client = requireAdminClient();
  const databaseId = databaseRestaurantId(restaurantId);
  const result = await client
    .from("orders")
    .select("*")
    .eq("restaurant_id", databaseId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (result.error) throw repositoryError(result.error.message);
  if (result.data.length === 0) return [];
  const items = await client
    .from("order_items")
    .select("*")
    .in("order_id", result.data.map((order) => order.id));
  if (items.error) throw repositoryError(items.error.message);
  const itemsByOrder = new Map<string, TableRow<"order_items">[]>();
  for (const item of items.data) {
    const current = itemsByOrder.get(item.order_id) ?? [];
    current.push(item);
    itemsByOrder.set(item.order_id, current);
  }
  return result.data.map(
    (order): DeletedRestaurantOrder => ({
      ...mapOrder(order, itemsByOrder.get(order.id) ?? []),
      deletedAt: order.deleted_at!,
    }),
  );
}

export async function restoreOrderInSupabase(
  restaurantId: string,
  orderId: string,
  actorUserId: string,
) {
  const client = requireAdminClient();
  const existing = await client
    .from("orders")
    .select("id, business_id, restaurant_id, status")
    .eq("id", orderId)
    .eq("restaurant_id", databaseRestaurantId(restaurantId))
    .not("deleted_at", "is", null)
    .maybeSingle();
  if (existing.error) throw repositoryError(existing.error.message);
  if (!existing.data) throw new OrderRepositoryError("Deleted order not found", 404);
  const restored = await client
    .from("orders")
    .update({ deleted_at: null })
    .eq("id", orderId)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();
  if (restored.error || !restored.data) {
    throw repositoryError(restored.error?.message ?? "Order could not be restored");
  }
  await insertOrderEvent({
    orderId,
    businessId: existing.data.business_id,
    restaurantId: existing.data.restaurant_id,
    actorUserId,
    eventType: "order.restored",
    details: { status: existing.data.status },
  });
  const order = await getOrderById(client, orderId);
  if (!order) throw repositoryError("Restored order could not be loaded");
  return order;
}

export async function recordOrderEvent(input: {
  restaurantId: string;
  orderId: string;
  actorUserId?: string;
  eventType: string;
  details?: Record<string, Json>;
}) {
  const client = requireAdminClient();
  const order = await client
    .from("orders")
    .select("business_id, restaurant_id")
    .eq("id", input.orderId)
    .eq("restaurant_id", databaseRestaurantId(input.restaurantId))
    .maybeSingle();
  if (order.error || !order.data) {
    throw repositoryError(order.error?.message ?? "Order not found");
  }
  await insertOrderEvent({
    orderId: input.orderId,
    businessId: order.data.business_id,
    restaurantId: order.data.restaurant_id,
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    details: input.details,
  });
}

export async function setOrderFulfillmentEstimate(input: {
  restaurantId: string;
  orderId: string;
  actorUserId: string;
  estimatedAt: string;
  estimateMinutes: number;
}) {
  const client = requireAdminClient();
  const databaseId = databaseRestaurantId(input.restaurantId);
  const order = await client
    .from("orders")
    .select("business_id, restaurant_id")
    .eq("id", input.orderId)
    .eq("restaurant_id", databaseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (order.error || !order.data) {
    throw repositoryError(order.error?.message ?? "Order not found");
  }
  const update = await client
    .from("orders")
    .update({ estimated_fulfillment_at: input.estimatedAt })
    .eq("id", input.orderId)
    .eq("restaurant_id", databaseId);
  if (update.error) throw repositoryError(update.error.message);
  await insertOrderEvent({
    orderId: input.orderId,
    businessId: order.data.business_id,
    restaurantId: order.data.restaurant_id,
    actorUserId: input.actorUserId,
    eventType: "order.fulfillment_estimated",
    details: {
      estimatedAt: input.estimatedAt,
      estimateMinutes: input.estimateMinutes,
    },
  });
}

async function insertOrderEvent(input: {
  orderId: string;
  businessId: string;
  restaurantId: string;
  actorUserId?: string;
  eventType: string;
  details?: Record<string, Json>;
}) {
  const client = requireAdminClient();
  const result = await client.from("order_events").insert({
    order_id: input.orderId,
    business_id: input.businessId,
    restaurant_id: input.restaurantId,
    actor_user_id: input.actorUserId ?? null,
    event_type: input.eventType,
    details: input.details ?? {},
  });
  if (result.error) throw repositoryError(result.error.message);
}

function jsonDetails(value: Json) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) =>
        item === null ||
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean",
    ),
  ) as Record<string, string | number | boolean | null>;
}

export async function getOrderByTrackingTokenFromSupabase(
  trackingToken: string,
) {
  const client = requireAdminClient();
  const tokenHash = createHash("sha256").update(trackingToken).digest("hex");
  const result = await client
    .from("orders")
    .select("id")
    .eq("tracking_token_hash", tokenHash)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) throw repositoryError(result.error.message);
  if (!result.data) return undefined;
  return (await getOrderById(client, result.data.id)) ?? undefined;
}

async function getOrderById(
  client: ReturnType<typeof requireAdminClient>,
  orderId: string,
) {
  const { data: order, error } = await client
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw repositoryError(error.message);
  if (!order) return null;

  const { data: items, error: itemsError } = await client
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);
  if (itemsError) throw repositoryError(itemsError.message);
  const payment = await client
    .from("payments")
    .select("id, status")
    .eq("order_id", order.id)
    .maybeSingle();
  if (payment.error) throw repositoryError(payment.error.message);
  return mapOrder(order, items, payment.data ?? undefined);
}

function mapOrder(
  order: TableRow<"orders">,
  items: TableRow<"order_items">[],
  payment?: { id: string; status: TableRow<"payments">["status"] },
): RestaurantOrder {
  return {
    id: order.id,
    restaurantId:
      legacyRestaurantIds[order.restaurant_id] ?? order.restaurant_id,
    orderNumber: order.order_number,
    orderType: order.order_type,
    deliveryAddress: parseDeliveryAddress(order.delivery_address),
    deliveryDistanceMeters: order.delivery_distance_meters ?? undefined,
    deliveryFee: order.delivery_fee_minor / 100,
    estimatedFulfillmentAt: order.estimated_fulfillment_at ?? undefined,
    tableNumber: order.table_number ?? undefined,
    customerName: order.customer_name,
    customerEmail: order.customer_email ?? undefined,
    customerPhone: order.customer_phone ?? undefined,
    customerNotes: order.customer_notes ?? undefined,
    contactVerified: order.contact_verified,
    paymentMethod: appPaymentMethod(order.payment_method),
    paymentId: payment?.id,
    paymentStatus: payment?.status,
    items: items.map((item) => ({
      menuItemId: item.menu_item_code,
      name: item.name_snapshot,
      quantity: item.quantity,
      unitPrice: item.unit_price_minor / 100,
    })),
    total: order.total_minor / 100,
    status: order.status,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    closedAt: order.closed_at ?? undefined,
    rejectionReason: order.rejection_reason ?? undefined,
  };
}

function customizationSummary(items: OrderInput["items"]) {
  const lines = items
    .filter((item) => item.excludedIngredients?.length)
    .map(
      (item) =>
        `${item.quantity} × ${item.name}: without ${item.excludedIngredients?.join(", ")}`,
    );
  return lines.length ? lines.join("\n").slice(0, 1000) : undefined;
}

function orderNotes(input: OrderInput) {
  return [input.customerNotes, customizationSummary(input.items)]
    .filter(Boolean)
    .join("\n")
    .slice(0, 1000) || undefined;
}

function databasePaymentMethod(
  method: OrderInput["paymentMethod"],
  provider?: OrderInput["onlinePaymentProvider"],
): "card" | "paypal" | "cash_on_site" | "cash_on_delivery" | "external_card" {
  if (
    method === "cash_on_site" ||
    method === "cash_on_delivery" ||
    method === "external_card"
  ) {
    return method;
  }
  return provider === "paypal" ? "paypal" : "card";
}

function appPaymentMethod(
  method: TableRow<"orders">["payment_method"],
): NonNullable<RestaurantOrder["paymentMethod"]> {
  if (
    method === "cash_on_site" ||
    method === "cash_on_delivery" ||
    method === "external_card"
  ) {
    return method;
  }
  return "online";
}

function parseDeliveryAddress(
  value: TableRow<"orders">["delivery_address"],
): RestaurantOrder["deliveryAddress"] {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return undefined;
  }
  const address = value as Record<string, Json | undefined>;
  if (
    typeof address.street !== "string" ||
    typeof address.postalCode !== "string" ||
    typeof address.city !== "string" ||
    address.countryCode !== "DE"
  ) {
    return undefined;
  }
  return {
    street: address.street,
    postalCode: address.postalCode,
    city: address.city,
    countryCode: "DE",
  };
}

function requireAdminClient() {
  const client = getAdminSupabase();
  if (!client) {
    throw new OrderRepositoryError(
      "Supabase server credentials are not configured",
      503,
    );
  }
  return client;
}

function repositoryError(message: string) {
  return new OrderRepositoryError(`Supabase order repository: ${message}`, 500);
}
