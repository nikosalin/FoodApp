import { NextRequest, NextResponse } from "next/server";
import { authorizeRestaurant } from "@/features/orders/server/api";
import { OrderRepositoryError } from "@/features/orders/server/order-repository";
import { getDeletedOrdersFromSupabase } from "@/features/orders/server/supabase-order-repository";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  const authorization = await authorizeRestaurant(request, restaurantId);
  if (authorization.error) return authorization.error;
  try {
    return NextResponse.json({
      orders: isSupabaseConfigured()
        ? await getDeletedOrdersFromSupabase(restaurantId)
        : [],
    });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
