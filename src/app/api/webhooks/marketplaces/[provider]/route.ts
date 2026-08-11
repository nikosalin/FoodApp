import { NextRequest, NextResponse } from "next/server";
import { marketplaceProviders, type MarketplaceProvider } from "@/features/marketplaces/types";
import { recordMarketplaceEvent } from "@/features/marketplaces/server/repository";
import {
  marketplaceEventIdentity,
  verifyMarketplaceWebhook,
} from "@/features/marketplaces/server/webhooks";

export const runtime = "nodejs";
const maxBodyBytes = 256 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: candidate } = await params;
  if (!marketplaceProviders.includes(candidate as MarketplaceProvider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  const provider = candidate as MarketplaceProvider;
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > maxBodyBytes) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody) > maxBodyBytes) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  if (!verifyMarketplaceWebhook(provider, rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    payload = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const identity = marketplaceEventIdentity(provider, payload);
  if (!identity.providerEventId || !identity.eventType) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }
  try {
    const result = await recordMarketplaceEvent({ provider, ...identity });
    return NextResponse.json({ received: true, connected: result.connected });
  } catch {
    return NextResponse.json({ error: "Event persistence unavailable" }, { status: 503 });
  }
}
