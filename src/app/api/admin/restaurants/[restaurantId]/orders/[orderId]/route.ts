import { NextRequest, NextResponse } from "next/server";
import {
  authorizeRestaurant,
  changeStatus,
  parseSmallJson,
  validateOrderInput,
} from "@/features/orders/server/api";
import {
  deleteOrder,
  OrderRepositoryError,
  updateOrderDetails,
} from "@/features/orders/server/order-repository";
import type { OrderStatus } from "@/features/admin/types";

const allowedStatuses: OrderStatus[] = [
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

export async function PATCH(
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
      typeof body.status !== "string" ||
      !allowedStatuses.includes(body.status as OrderStatus)
    ) {
      return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
    }
    return changeStatus({
      restaurantId,
      orderId,
      status: body.status as OrderStatus,
    });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ restaurantId: string; orderId: string }> },
) {
  const { restaurantId, orderId } = await params;
  const authorization = authorizeRestaurant(request, restaurantId, true);
  if (authorization.error) return authorization.error;
  try {
    const input = validateOrderInput(
      await parseSmallJson(request),
      restaurantId,
    );
    return NextResponse.json({
      order: updateOrderDetails(restaurantId, orderId, input),
    });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ restaurantId: string; orderId: string }> },
) {
  const { restaurantId, orderId } = await params;
  const authorization = authorizeRestaurant(request, restaurantId, true);
  if (authorization.error) return authorization.error;
  try {
    deleteOrder(restaurantId, orderId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
