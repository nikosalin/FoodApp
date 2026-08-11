import { NextRequest, NextResponse } from "next/server";
import { hasValidOrigin } from "@/features/orders/server/auth";
import { authorizeMarketplaceAdmin } from "@/features/marketplaces/server/admin-auth";
import type { MarketplaceOrderAction } from "@/features/marketplaces/server/connector";
import {
  getMarketplaceActionTarget,
  updateMarketplaceOrderAfterAction,
} from "@/features/marketplaces/server/repository";
import {
  MarketplaceProviderError,
  sendMarketplaceOrderAction,
} from "@/features/marketplaces/server/provider-client";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const authorization = await authorizeMarketplaceAdmin(request);
  if (!authorization) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { orderId } = await params;
  const target = await getMarketplaceActionTarget(orderId, authorization.businessIds);
  if (!target) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = parseAction(body);
    await sendMarketplaceOrderAction(
      { provider: target.provider, externalStoreId: target.external_store_id },
      target.external_order_id,
      action,
    );
    const status = action.type === "accept" ? "accepted" : action.type === "ready" ? "ready" : action.type === "reject" ? "rejected" : "cancelled";
    await updateMarketplaceOrderAfterAction(
      target.id,
      status,
      action.type === "accept" ? action.preparationMinutes : undefined,
    );
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    if (error instanceof MarketplaceProviderError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "marketplace_action_failed" }, { status: 500 });
  }
}

function parseAction(body: Record<string, unknown>): MarketplaceOrderAction {
  if (body.type === "accept") {
    const preparationMinutes = Number(body.preparationMinutes);
    if (!Number.isInteger(preparationMinutes) || preparationMinutes < 5 || preparationMinutes > 120) {
      throw new MarketplaceProviderError("Preparation time must be 5–120 minutes", 400, "invalid_action");
    }
    return { type: "accept", preparationMinutes };
  }
  if (body.type === "ready") return { type: "ready" };
  if (body.type === "reject" || body.type === "cancel") {
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 3 || reason.length > 250) {
      throw new MarketplaceProviderError("A reason is required", 400, "invalid_action");
    }
    return { type: body.type, reason };
  }
  throw new MarketplaceProviderError("Unsupported action", 400, "invalid_action");
}
