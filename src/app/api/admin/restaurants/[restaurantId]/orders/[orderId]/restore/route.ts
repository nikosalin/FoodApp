import { NextRequest, NextResponse } from "next/server";
import { authorizeRestaurant } from "@/features/orders/server/api";
import { OrderRepositoryError } from "@/features/orders/server/order-repository";
import { restoreOrderInSupabase } from "@/features/orders/server/supabase-order-repository";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string; orderId: string }> },
) {
  const { restaurantId, orderId } = await params;
  const authorization = await authorizeRestaurant(request, restaurantId, true);
  if (authorization.error) return authorization.error;
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Restore requires Supabase persistence" },
      { status: 409 },
    );
  }
  try {
    return NextResponse.json({
      order: await restoreOrderInSupabase(
        restaurantId,
        orderId,
        authorization.session.sub,
      ),
    });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
