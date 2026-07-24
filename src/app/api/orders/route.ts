import { NextRequest, NextResponse } from "next/server";
import {
  hasValidOrigin,
} from "@/features/orders/server/auth";
import {
  parseSmallJson,
  validateOrderInput,
} from "@/features/orders/server/api";
import {
  createOrder,
  OrderRepositoryError,
} from "@/features/orders/server/order-repository";
import {
  allowGuestOrder,
  getIdempotentOrder,
  rememberIdempotentOrder,
} from "@/features/orders/server/guest-orders";
import { seedAdminState } from "@/features/admin/data/seed";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 100) {
    return NextResponse.json(
      { error: "A valid Idempotency-Key header is required" },
      { status: 400 },
    );
  }
  const existing = getIdempotentOrder(idempotencyKey);
  if (existing) {
    return NextResponse.json({ order: publicOrder(existing) });
  }
  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";
  if (!allowGuestOrder(clientKey)) {
    return NextResponse.json(
      { error: "Too many order attempts. Try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await parseSmallJson(request);
    const restaurantId =
      typeof body.restaurantId === "string" ? body.restaurantId : "";
    const restaurant = seedAdminState.restaurants.find(
      (candidate) =>
        candidate.id === restaurantId && candidate.status !== "blocked",
    );
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant is not accepting orders" },
        { status: 404 },
      );
    }
    const order = createOrder(validateOrderInput(body, restaurantId));
    rememberIdempotentOrder(idempotencyKey, order);
    return NextResponse.json({ order: publicOrder(order) }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

function publicOrder(order: ReturnType<typeof createOrder>) {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    trackingToken: order.trackingToken,
    notificationStatus: order.notificationStatus,
  };
}
