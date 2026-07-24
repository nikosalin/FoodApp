import { NextRequest, NextResponse } from "next/server";
import {
  authorizeRestaurant,
  changeStatus,
  parseSmallJson,
} from "@/features/orders/server/api";
import { OrderRepositoryError } from "@/features/orders/server/order-repository";

export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ restaurantId: string; orderId: string }> },
) {
  const { restaurantId, orderId } = await params;
  const authorization = authorizeRestaurant(request, restaurantId, true);
  if (authorization.error) return authorization.error;
  try {
    const body = await parseSmallJson(request);
    if (
      typeof body.reason !== "string" ||
      body.reason.trim().length < 3 ||
      body.reason.length > 300
    ) {
      return NextResponse.json(
        { error: "A rejection reason between 3 and 300 characters is required" },
        { status: 400 },
      );
    }
    return changeStatus({
      restaurantId,
      orderId,
      status: "rejected",
      rejectionReason: body.reason,
    });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
