import { NextResponse } from "next/server";
import { getOrderByTrackingToken } from "@/features/orders/server/order-repository";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { getOrderByTrackingTokenFromSupabase } from "@/features/orders/server/supabase-order-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trackingToken: string }> },
) {
  const { trackingToken } = await params;
  if (!/^[a-f0-9]{32,64}$/.test(trackingToken)) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const order = isSupabaseConfigured()
    ? await getOrderByTrackingTokenFromSupabase(trackingToken)
    : getOrderByTrackingToken(trackingToken);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({
    order: {
      orderNumber: order.orderNumber,
      restaurantId: order.restaurantId,
      status: order.status,
      orderType: order.orderType,
      estimatedFulfillmentAt: order.estimatedFulfillmentAt,
      items: order.items,
      total: order.total,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      rejectionReason: order.rejectionReason,
    },
  });
}
