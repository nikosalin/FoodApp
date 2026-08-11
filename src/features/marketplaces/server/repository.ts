import "server-only";

import type {
  MarketplaceConnection,
  MarketplaceOrderSummary,
  MarketplaceProvider,
} from "../types";

type MarketplaceEventInput = {
  provider: MarketplaceProvider;
  providerEventId: string;
  eventType: string;
  externalStoreId?: string;
  externalOrderId?: string;
  safeMetadata?: Record<string, string | number | boolean | null>;
};

export type MarketplaceActionTarget = {
  id: string;
  connection_id: string;
  provider: MarketplaceProvider;
  external_order_id: string;
  status: string;
  external_store_id: string;
};

export async function getMarketplaceDashboardRows(businessIds: string[]) {
  if (businessIds.length === 0) return { connections: [], orders: [] };
  const filter = businessIds.join(",");
  const connections = await marketplaceRest<MarketplaceConnection[]>(
    `/marketplace_connections?select=id,provider,external_store_id,display_name,status,last_event_at,last_sync_at,last_error_code&business_id=in.(${filter})&order=provider`,
  );
  const orders = await marketplaceRest<MarketplaceOrderSummary[]>(
    `/marketplace_orders?select=id,provider,external_order_id,display_order_id,status,fulfillment_type,total_minor,currency,preparation_minutes,placed_at&business_id=in.(${filter})&order=placed_at.desc&limit=50`,
  );
  return { connections, orders };
}

export async function recordMarketplaceEvent(input: MarketplaceEventInput) {
  let connectionId: string | null = null;
  if (input.externalStoreId) {
    const matches = await marketplaceRest<{ id: string }[]>(
      `/marketplace_connections?select=id&provider=eq.${input.provider}&external_store_id=eq.${encodeURIComponent(input.externalStoreId)}&limit=1`,
    );
    connectionId = matches[0]?.id ?? null;
  }

  const response = await marketplaceRestRaw(
    `/marketplace_events?on_conflict=provider,provider_event_id`,
    {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({
        connection_id: connectionId,
        provider: input.provider,
        provider_event_id: input.providerEventId,
        event_type: input.eventType,
        external_store_id: input.externalStoreId ?? null,
        external_order_id: input.externalOrderId ?? null,
        safe_metadata: input.safeMetadata ?? {},
      }),
    },
  );
  if (!response.ok) throw new Error(`marketplace_event_${response.status}`);
  return { connected: Boolean(connectionId) };
}

export async function getMarketplaceActionTarget(
  orderId: string,
  businessIds: string[],
) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || businessIds.length === 0) return null;
  const orders = await marketplaceRest<Array<{
    id: string;
    connection_id: string;
    provider: MarketplaceProvider;
    external_order_id: string;
    status: string;
  }>>(
    `/marketplace_orders?select=id,connection_id,provider,external_order_id,status&id=eq.${orderId}&business_id=in.(${businessIds.join(",")})&limit=1`,
  );
  const order = orders[0];
  if (!order) return null;
  const connections = await marketplaceRest<Array<{ external_store_id: string }>>(
    `/marketplace_connections?select=external_store_id&id=eq.${order.connection_id}&limit=1`,
  );
  return connections[0] ? { ...order, external_store_id: connections[0].external_store_id } : null;
}

export async function getMarketplaceConnectionTarget(
  connectionId: string,
  businessIds: string[],
) {
  if (!/^[0-9a-f-]{36}$/i.test(connectionId) || businessIds.length === 0) return null;
  const rows = await marketplaceRest<Array<{
    id: string;
    provider: MarketplaceProvider;
    external_store_id: string;
  }>>(
    `/marketplace_connections?select=id,provider,external_store_id&id=eq.${connectionId}&business_id=in.(${businessIds.join(",")})&limit=1`,
  );
  return rows[0] ?? null;
}

export async function updateMarketplaceOrderAfterAction(
  orderId: string,
  status: string,
  preparationMinutes?: number,
) {
  const timestamps =
    status === "accepted"
      ? { accepted_at: new Date().toISOString() }
      : status === "ready"
        ? { ready_at: new Date().toISOString() }
        : status === "rejected" || status === "cancelled"
          ? { closed_at: new Date().toISOString() }
          : {};
  const response = await marketplaceRestRaw(`/marketplace_orders?id=eq.${orderId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status,
      preparation_minutes: preparationMinutes ?? undefined,
      ...timestamps,
    }),
  });
  if (!response.ok) throw new Error(`marketplace_order_update_${response.status}`);
}

export async function updateMarketplaceConnectionAvailability(
  connectionId: string,
  online: boolean,
) {
  const response = await marketplaceRestRaw(
    `/marketplace_connections?id=eq.${connectionId}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: online ? "active" : "disabled",
        last_sync_at: new Date().toISOString(),
        last_error_code: null,
      }),
    },
  );
  if (!response.ok) throw new Error(`marketplace_connection_update_${response.status}`);
}

async function marketplaceRest<T>(path: string): Promise<T> {
  const response = await marketplaceRestRaw(path);
  if (!response.ok) throw new Error(`marketplace_repository_${response.status}`);
  return (await response.json()) as T;
}

function marketplaceRestRaw(path: string, init?: RequestInit) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("marketplace_repository_unavailable");
  return fetch(`${url}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
}
