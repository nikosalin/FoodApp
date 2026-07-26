import { NextResponse } from "next/server";
import { seedAdminState } from "@/features/admin/data/seed";
import { getRestaurantAvailability } from "@/features/restaurants/server/availability";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  if (!seedAdminState.restaurants.some((item) => item.id === restaurantId)) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }
  const availability = await getRestaurantAvailability(restaurantId);
  return NextResponse.json(
    { availability },
    { headers: { "Cache-Control": "no-store" } },
  );
}
