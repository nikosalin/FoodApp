"use client";

import type {
  OrderInput,
  OrderStatus,
  RestaurantOrder,
} from "@/features/admin/types";

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error || "The order request failed");
  }
  return body as T;
}

function orderBase(restaurantId: string, orderId?: string) {
  const base = `/api/admin/restaurants/${encodeURIComponent(restaurantId)}/orders`;
  return orderId ? `${base}/${encodeURIComponent(orderId)}` : base;
}

export async function getRestaurantOrders(restaurantId: string) {
  const result = await apiRequest<{ orders: RestaurantOrder[] }>(
    orderBase(restaurantId),
  );
  return result.orders;
}

export function subscribeToRestaurantOrders(
  restaurantId: string,
  onChange: () => void,
) {
  const source = new EventSource(`${orderBase(restaurantId)}/stream`);
  source.addEventListener("orders-changed", onChange);
  return () => source.close();
}

export async function createAdminOrder(
  restaurantId: string,
  input: Omit<OrderInput, "restaurantId">,
) {
  const result = await apiRequest<{ order: RestaurantOrder }>(
    orderBase(restaurantId),
    { method: "POST", body: JSON.stringify(input) },
  );
  return result.order;
}

export async function editAdminOrder(
  restaurantId: string,
  orderId: string,
  input: Omit<OrderInput, "restaurantId">,
) {
  const result = await apiRequest<{ order: RestaurantOrder }>(
    orderBase(restaurantId, orderId),
    { method: "PUT", body: JSON.stringify(input) },
  );
  return result.order;
}

export async function deleteAdminOrder(
  restaurantId: string,
  orderId: string,
) {
  const response = await fetch(orderBase(restaurantId, orderId), {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error || "Unable to delete order");
  }
}

export async function acceptOrder(restaurantId: string, orderId: string) {
  const result = await apiRequest<{ order: RestaurantOrder }>(
    `${orderBase(restaurantId, orderId)}/accept`,
    { method: "POST" },
  );
  return result.order;
}

export async function declineOrder(
  restaurantId: string,
  orderId: string,
  reason: string,
) {
  const result = await apiRequest<{ order: RestaurantOrder }>(
    `${orderBase(restaurantId, orderId)}/decline`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
  return result.order;
}

export async function updateOrderStatus(
  restaurantId: string,
  orderId: string,
  status: Exclude<OrderStatus, "pending" | "rejected">,
) {
  const result = await apiRequest<{ order: RestaurantOrder }>(
    orderBase(restaurantId, orderId),
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
  return result.order;
}
