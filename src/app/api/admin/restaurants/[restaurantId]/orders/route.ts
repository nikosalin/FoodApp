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
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  createOrderInSupabase,
  getOrdersForRestaurantFromSupabase,
} from "@/features/orders/server/supabase-order-repository";
import { getRestaurantAvailability } from "@/features/restaurants/server/availability";
import {
  calculateDeliveryQuote,
  DeliveryQuoteError,
} from "@/features/restaurants/server/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        ? await getOrdersForRestaurantFromSupabase(restaurantId)
        : getOrdersForRestaurant(restaurantId),
    });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  const authorization = await authorizeRestaurant(request, restaurantId, true);
  if (authorization.error) return authorization.error;
  try {
    const input = validateOrderInput(await parseSmallJson(request), restaurantId);
    if (input.orderType === "delivery" && input.deliveryAddress) {
      const subtotal = input.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
      const quote = await calculateDeliveryQuote(
        restaurantId,
        input.deliveryAddress,
        subtotal,
      );
      if (!quote.minimumMet) {
        throw new DeliveryQuoteError(
          `Minimum order for this address is €${quote.minimumOrder.toFixed(2)}`,
          422,
          "minimum_order_not_met",
        );
      }
      input.deliveryQuote = {
        zoneId: quote.zoneId,
        distanceMeters: quote.distanceMeters,
        deliveryFee: quote.deliveryFee,
      };
    }
    if (input.paymentMethod === "cash_on_delivery") {
      const availability = await getRestaurantAvailability(restaurantId);
      if (!availability.cashOnDeliveryEnabled) {
        return NextResponse.json(
          { error: "Cash on delivery is disabled for this restaurant" },
          { status: 409 },
        );
      }
    }
    const order = isSupabaseConfigured()
      ? await createOrderInSupabase(input, {
          idempotencyKey: crypto.randomUUID(),
          source: "admin",
          createdBy: authorization.session.sub,
        })
      : createOrder(input);
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof DeliveryQuoteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
