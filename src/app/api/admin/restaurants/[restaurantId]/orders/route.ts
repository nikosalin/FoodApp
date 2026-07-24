import { NextRequest, NextResponse } from "next/server";
import {
  authorizeRestaurant,
  parseSmallJson,
  validateOrderInput,
} from "@/features/orders/server/api";
import {
  createOrder,
  getOrdersForRestaurant,
  OrderRepositoryError,
} from "@/features/orders/server/order-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  const authorization = authorizeRestaurant(request, restaurantId);
  if (authorization.error) return authorization.error;
  return NextResponse.json({
    orders: getOrdersForRestaurant(restaurantId),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  const authorization = authorizeRestaurant(request, restaurantId, true);
  if (authorization.error) return authorization.error;
  try {
    const input = validateOrderInput(await parseSmallJson(request), restaurantId);
    return NextResponse.json(
      { order: createOrder(input) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
