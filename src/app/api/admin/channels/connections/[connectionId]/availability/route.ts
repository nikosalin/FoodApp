import { NextRequest, NextResponse } from "next/server";
import { hasValidOrigin } from "@/features/orders/server/auth";
import { authorizeMarketplaceAdmin } from "@/features/marketplaces/server/admin-auth";
import {
  getMarketplaceConnectionTarget,
  updateMarketplaceConnectionAvailability,
} from "@/features/marketplaces/server/repository";
import {
  MarketplaceProviderError,
  sendMarketplaceAvailability,
} from "@/features/marketplaces/server/provider-client";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> },
) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const authorization = await authorizeMarketplaceAdmin(request);
  if (!authorization) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { connectionId } = await params;
  const target = await getMarketplaceConnectionTarget(connectionId, authorization.businessIds);
  if (!target) return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  try {
    const body = (await request.json()) as { online?: unknown };
    if (typeof body.online !== "boolean") return NextResponse.json({ error: "Invalid availability" }, { status: 400 });
    await sendMarketplaceAvailability(
      { provider: target.provider, externalStoreId: target.external_store_id },
      body.online,
    );
    await updateMarketplaceConnectionAvailability(target.id, body.online);
    return NextResponse.json({ ok: true, online: body.online });
  } catch (error) {
    if (error instanceof MarketplaceProviderError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "marketplace_availability_failed" }, { status: 500 });
  }
}
