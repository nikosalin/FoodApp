import "server-only";

import { createHash } from "node:crypto";
import type {
  OrderInput,
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
    p_customer_notes: null,
    p_payment_method: databasePaymentMethod(input.paymentMethod),
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
}) {
  const client = requireAdminClient();
  const now = new Date().toISOString();
  const changes = {
    status: input.status,
    rejection_reason:
      input.status === "rejected" ? input.rejectionReason : null,
    accepted_at: input.status === "accepted" ? now : undefined,
    closed_at: ["completed", "cancelled", "rejected"].includes(input.status)
      ? now
      : undefined,
  };
  const { data, error } = await client
    .from("orders")
    .update(changes)
    .eq("id", input.orderId)
    .eq("restaurant_id", databaseRestaurantId(input.restaurantId))
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw repositoryError(error.message);
  if (!data) throw new OrderRepositoryError("Order not found", 404);

  const order = await getOrderById(client, data.id);
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
}

export async function updateOrderDetailsInSupabase(
  restaurantId: string,
  orderId: string,
  input: Omit<OrderInput, "restaurantId">,
  actorUserId: string,
) {
  const client = requireAdminClient();
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
    p_payment_method: databasePaymentMethod(input.paymentMethod),
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
  return await getOrderFromSupabase(restaurantId, orderId);
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
    tableNumber: order.table_number ?? undefined,
    customerName: order.customer_name,
    customerEmail: order.customer_email ?? undefined,
    customerPhone: order.customer_phone ?? undefined,
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

function databasePaymentMethod(
  method: OrderInput["paymentMethod"],
): "card" | "cash_on_site" | "cash_on_delivery" | "external_card" {
  if (
    method === "cash_on_site" ||
    method === "cash_on_delivery" ||
    method === "external_card"
  ) {
    return method;
  }
  return "card";
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
