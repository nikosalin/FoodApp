import "server-only";

import type { MarketplaceOrderAction } from "./connector";
import type { MarketplaceProvider } from "../types";
import { providerMode } from "./config";

type ProviderContext = {
  provider: MarketplaceProvider;
  externalStoreId: string;
};

let uberTokenCache: { token: string; expiresAt: number } | undefined;

export async function sendMarketplaceOrderAction(
  context: ProviderContext,
  externalOrderId: string,
  action: MarketplaceOrderAction,
) {
  if (context.provider === "wolt") {
    return sendWoltAction(externalOrderId, action);
  }
  if (context.provider === "uber_eats") {
    return sendUberAction(externalOrderId, action);
  }
  return sendJetAction(externalOrderId, action);
}

export async function sendMarketplaceAvailability(
  context: ProviderContext,
  online: boolean,
) {
  if (context.provider === "wolt") {
    return providerFetch(
      `https://pos-integration-service.wolt.com/venues/${encodeURIComponent(context.externalStoreId)}/online`,
      { method: "PATCH", headers: await woltHeaders(), body: JSON.stringify({ online }) },
    );
  }
  if (context.provider === "uber_eats") {
    const base = providerMode("uber_eats") === "sandbox" ? "https://test-api.uber.com" : "https://api.uber.com";
    return providerFetch(
      `${base}/v1/delivery/store/${encodeURIComponent(context.externalStoreId)}/status`,
      {
        method: "POST",
        headers: await uberHeaders(),
        body: JSON.stringify({ status: online ? "ONLINE" : "PAUSED" }),
      },
    );
  }
  return providerFetch(
    `https://api.flytplatform.com/restaurants/${encodeURIComponent(context.externalStoreId)}/${online ? "online" : "offline"}`,
    { method: "PUT", headers: jetHeaders(), body: JSON.stringify({}) },
  );
}

async function sendWoltAction(orderId: string, action: MarketplaceOrderAction) {
  const path = action.type === "accept" ? "accept" : action.type === "reject" ? "reject" : action.type === "ready" ? "ready" : "reject";
  const body =
    action.type === "accept"
      ? { adjusted_pickup_time: new Date(Date.now() + action.preparationMinutes * 60_000).toISOString() }
      : action.type === "reject" || action.type === "cancel"
        ? { reason: action.reason, code: "GENERIC" }
        : undefined;
  return providerFetch(
    `https://pos-integration-service.wolt.com/orders/${encodeURIComponent(orderId)}/${path}`,
    { method: "PUT", headers: await woltHeaders(), body: body ? JSON.stringify(body) : undefined },
  );
}

async function sendUberAction(orderId: string, action: MarketplaceOrderAction) {
  const base = providerMode("uber_eats") === "sandbox" ? "https://test-api.uber.com" : "https://api.uber.com";
  const path = action.type === "accept" ? "accept" : action.type === "reject" ? "deny" : action.type;
  const body =
    action.type === "accept"
      ? { ready_for_pickup_time: new Date(Date.now() + action.preparationMinutes * 60_000).toISOString() }
      : action.type === "reject"
        ? { deny_reason: { type: "OTHER", info: action.reason } }
        : action.type === "cancel"
          ? { cancellation_reason: { type: "OTHER", info: action.reason } }
          : {};
  return providerFetch(
    `${base}/v1/delivery/order/${encodeURIComponent(orderId)}/${path}`,
    { method: "POST", headers: await uberHeaders(), body: JSON.stringify(body) },
  );
}

async function sendJetAction(orderId: string, action: MarketplaceOrderAction) {
  if (action.type === "ready" || action.type === "cancel") {
    throw new MarketplaceProviderError("This action is not supported by JET Connect", 409, "unsupported_action");
  }
  const successful = action.type === "accept";
  return providerFetch(
    `https://order-injection-status-updater.flyt-platform.com/order/${encodeURIComponent(orderId)}/sent-to-pos-${successful ? "success" : "failed"}`,
    {
      method: "POST",
      headers: jetHeaders(),
      body: JSON.stringify(
        successful
          ? { happenedAt: new Date().toISOString() }
          : { happenedAt: new Date().toISOString(), errorCode: "UNKNOWN", errorMessage: action.reason },
      ),
    },
  );
}

async function woltHeaders() {
  return jsonBearerHeaders(required("WOLT_ACCESS_TOKEN"));
}

async function uberHeaders() {
  return jsonBearerHeaders(await uberAccessToken());
}

function jetHeaders() {
  return { "Content-Type": "application/json", "X-Flyt-Api-Key": required("JET_CONNECT_API_KEY") };
}

function jsonBearerHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function uberAccessToken() {
  if (uberTokenCache && uberTokenCache.expiresAt > Date.now() + 60_000) return uberTokenCache.token;
  const sandbox = providerMode("uber_eats") === "sandbox";
  const response = await fetch(sandbox ? "https://sandbox-login.uber.com/oauth/v2/token" : "https://auth.uber.com/oauth/v2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: required("UBER_EATS_CLIENT_ID"),
      client_secret: required("UBER_EATS_CLIENT_SECRET"),
      grant_type: "client_credentials",
      scope: "eats.store eats.store.status.write eats.order",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new MarketplaceProviderError("Uber authentication failed", 502, "provider_auth_failed");
  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new MarketplaceProviderError("Uber authentication failed", 502, "provider_auth_failed");
  uberTokenCache = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

async function providerFetch(url: string, init: RequestInit) {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store" });
  } catch {
    throw new MarketplaceProviderError("Provider is temporarily unreachable", 502, "provider_unavailable");
  }
  if (!response.ok) {
    throw new MarketplaceProviderError("Provider rejected the action", response.status === 409 ? 409 : 502, `provider_${response.status}`);
  }
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new MarketplaceProviderError(`Missing ${name}`, 503, "provider_configuration_missing");
  return value;
}

export class MarketplaceProviderError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}
