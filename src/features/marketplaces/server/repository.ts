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

