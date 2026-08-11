import { NextRequest, NextResponse } from "next/server";
import { authorizeMarketplaceAdmin } from "@/features/marketplaces/server/admin-auth";
import { marketplaceProviderStatuses } from "@/features/marketplaces/server/config";
import { getMarketplaceDashboardRows } from "@/features/marketplaces/server/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeMarketplaceAdmin(request);
  if (!authorization) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  try {
    const rows = await getMarketplaceDashboardRows(authorization.businessIds);
    return NextResponse.json({
      providers: marketplaceProviderStatuses(),
      ...rows,
    });
  } catch {
    return NextResponse.json(
      {
        providers: marketplaceProviderStatuses(),
        connections: [],
        orders: [],
        warning: "Marketplace database migration has not been applied yet.",
      },
      { status: 200 },
    );
  }
}

