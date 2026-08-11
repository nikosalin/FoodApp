import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { MarketplaceProvider } from "../types";
import { providerWebhookSecret } from "./config";

type MarketplaceEventIdentity = {
  providerEventId: string;
  eventType: string;
  externalStoreId: string;
  externalOrderId: string;
  safeMetadata: Record<string, string | number | boolean | null>;
};

export function verifyMarketplaceWebhook(
  provider: MarketplaceProvider,
  rawBody: string,
  headers: Headers,
) {
  const secret = providerWebhookSecret(provider);
  if (!secret) return false;
  if (provider === "lieferando") {
    return safeEqual(
      headers.get("authorization") ?? "",
      `Bearer ${secret}`,
    );
  }
  const headerName = provider === "wolt" ? "wolt-signature" : "x-uber-signature";
  const supplied = headers.get(headerName)?.trim().toLowerCase() ?? "";
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(supplied, expected);
}

export function marketplaceEventIdentity(
  provider: MarketplaceProvider,
  payload: Record<string, unknown>,
): MarketplaceEventIdentity {
  if (provider === "wolt") {
    const order = object(payload.order);
    return {
      providerEventId: string(payload.id),
      eventType: string(payload.type) || "order.notification",
      externalStoreId: string(order.venue_id),
      externalOrderId: string(order.id),
      safeMetadata: { status: string(order.status) || null },
    };
  }
  if (provider === "uber_eats") {
    const meta = object(payload.meta);
    return {
      providerEventId:
        string(payload.event_id) ||
        [string(payload.event_type), string(payload.resource_id)].filter(Boolean).join(":"),
      eventType: string(payload.event_type) || "unknown",
      externalStoreId: string(payload.user_id) || string(meta.user_id),
      externalOrderId: string(payload.resource_id),
      safeMetadata: {},
    };
  }
  return {
    providerEventId: string(payload.id) || string(payload.orderID),
    eventType: string(payload.event) || string(payload.type) || "order.notification",
    externalStoreId: string(payload.posLocationId) || string(payload.restaurantId),
    externalOrderId:
      string(payload.third_party_order_reference) || string(payload.orderID) || string(payload.id),
    safeMetadata: {},
  };
}

function safeEqual(first: string, second: string) {
  const left = Buffer.from(first);
  const right = Buffer.from(second);
  return left.length === right.length && timingSafeEqual(left, right);
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function string(value: unknown) {
  return typeof value === "string" ? value.slice(0, 255) : "";
}
