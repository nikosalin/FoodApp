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
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  deleteOrderInSupabase,
  updateOrderDetailsInSupabase,
  updateOrderStatusInSupabase,
} from "@/features/orders/server/supabase-order-repository";
import { getPaymentForOrder } from "@/features/payments/server/payment-repository";
import { getRestaurantAvailability } from "@/features/restaurants/server/availability";

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
    if (body.status === "cancelled") {
      const payment = await getPaymentForOrder(orderId);
      if (payment?.status === "captured") {
        return NextResponse.json(
          { error: "Refund the captured payment before cancelling the order" },
          { status: 409 },
        );
      }
    }
    if (isSupabaseConfigured()) {
      return NextResponse.json({
        order: await updateOrderStatusInSupabase({
          restaurantId,
          orderId,
          status: body.status as OrderStatus,
        }),
      });
    }
    return changeStatus({ restaurantId, orderId, status: body.status as OrderStatus });
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
    if (input.paymentMethod === "cash_on_delivery") {
      const availability = await getRestaurantAvailability(restaurantId);
      if (!availability.cashOnDeliveryEnabled) {
        return NextResponse.json(
          { error: "Cash on delivery is disabled for this restaurant" },
          { status: 409 },
        );
      }
    }
    if (isSupabaseConfigured()) {
      return NextResponse.json({
        order: await updateOrderDetailsInSupabase(
          restaurantId,
          orderId,
          input,
          authorization.session.sub,
        ),
      });
    }
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
    if (isSupabaseConfigured()) {
      await deleteOrderInSupabase(
        restaurantId,
        orderId,
        authorization.session.sub,
      );
    } else {
      deleteOrder(restaurantId, orderId);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
