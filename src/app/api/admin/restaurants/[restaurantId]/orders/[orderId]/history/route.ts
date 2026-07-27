import { NextRequest, NextResponse } from "next/server";
import { authorizeRestaurant } from "@/features/orders/server/api";
import { getOrder, OrderRepositoryError } from "@/features/orders/server/order-repository";
import { getOrderHistoryFromSupabase } from "@/features/orders/server/supabase-order-repository";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string; orderId: string }> },
) {
  const { restaurantId, orderId } = await params;
  const authorization = await authorizeRestaurant(request, restaurantId);
  if (authorization.error) return authorization.error;
  try {
    if (isSupabaseConfigured()) {
      return NextResponse.json({
        events: await getOrderHistoryFromSupabase(restaurantId, orderId),
      });
    }
    const order = getOrder(restaurantId, orderId);
    return NextResponse.json({
      events: [
        {
          id: `created-${order.id}`,
          orderId: order.id,
          eventType: "order.created",
          toStatus: "pending",
          actorName: "Development repository",
          details: {},
          createdAt: order.createdAt,
        },
        ...(order.updatedAt && order.status !== "pending"
          ? [
              {
                id: `current-${order.id}`,
                orderId: order.id,
                eventType: "order.status_changed",
                fromStatus: "pending",
                toStatus: order.status,
                actorName: "Development repository",
                details: {},
                createdAt: order.updatedAt,
              },
            ]
          : []),
      ],
    });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
