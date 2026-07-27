import { NextRequest, NextResponse } from "next/server";
import {
  hasValidOrigin,
} from "@/features/orders/server/auth";
import {
  parseSmallJson,
  validateOrderInput,
} from "@/features/orders/server/api";
import {
  attachOrderPayment,
  createOrder,
  deleteOrder,
  OrderRepositoryError,
} from "@/features/orders/server/order-repository";
import { authorizeOnlinePayment } from "@/features/payments/server/service";
import { PaymentError } from "@/features/payments/server/errors";
import { paypalCheckoutEnabled } from "@/features/payments/server/config";
import { getRestaurantAvailability } from "@/features/restaurants/server/availability";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { createOrderInSupabase } from "@/features/orders/server/supabase-order-repository";
import {
  allowGuestOrder,
  getIdempotentOrder,
  rememberIdempotentOrder,
} from "@/features/orders/server/guest-orders";
import { seedAdminState } from "@/features/admin/data/seed";
import {
  calculateDeliveryQuote,
  DeliveryQuoteError,
} from "@/features/restaurants/server/delivery";

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
    const availability = await getRestaurantAvailability(restaurantId);
    if (!availability.acceptingOrders) {
      return NextResponse.json(
        {
          error: "ordering_closed",
          message: availability.message,
          availability,
        },
        { status: 409 },
      );
    }
    const input = validateOrderInput(body, restaurantId);
    if (
      input.paymentMethod === "online" &&
      input.onlinePaymentProvider === "paypal" &&
      !paypalCheckoutEnabled()
    ) {
      return NextResponse.json(
        { error: "paypal_unavailable", message: "PayPal is currently unavailable" },
        { status: 409 },
      );
    }
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
    if (
      input.paymentMethod === "cash_on_delivery" &&
      !availability.cashOnDeliveryEnabled
    ) {
      return NextResponse.json(
        { error: "cash_on_delivery_unavailable" },
        { status: 409 },
      );
    }
    const order = isSupabaseConfigured()
      ? await createOrderInSupabase(input, {
          idempotencyKey,
          source: "guest",
        })
      : createOrder(input);
    let payment:
      | Awaited<ReturnType<typeof authorizeOnlinePayment>>["payment"]
      | undefined;
    let clientSecret: string | undefined;
    let checkoutUrl: string | undefined;
    if (order.paymentMethod === "online") {
      try {
        const provider = input.onlinePaymentProvider ?? "stripe";
        const trackingToken = order.trackingToken;
        if (!trackingToken) {
          throw new PaymentError(
            "Order tracking token is unavailable",
            503,
            "payment_return_unavailable",
          );
        }
        const returnUrl =
          provider === "paypal"
            ? `${request.nextUrl.origin}/api/payments/paypal/return?slug=${encodeURIComponent(restaurant.slug)}&trackingToken=${encodeURIComponent(trackingToken)}`
            : `${request.nextUrl.origin}/menu/${restaurant.slug}?payment=complete`;
        const authorization = await authorizeOnlinePayment(provider, {
          orderId: order.id,
          businessId: businessIdForRestaurant(restaurantId),
          restaurantId,
          amountMinor: Math.round(order.total * 100),
          currency: "EUR",
          idempotencyKey: `authorize/${idempotencyKey}`,
          returnUrl,
          cancelUrl: `${request.nextUrl.origin}/menu/${restaurant.slug}?paypal=cancelled`,
        });
        payment = authorization.payment;
        clientSecret = authorization.clientSecret;
        checkoutUrl = authorization.checkoutUrl;
        if (!isSupabaseConfigured()) {
          attachOrderPayment(restaurantId, order.id, payment);
        }
      } catch (error) {
        if (!isSupabaseConfigured()) deleteOrder(restaurantId, order.id);
        throw error;
      }
    }
    rememberIdempotentOrder(idempotencyKey, order);
    return NextResponse.json(
      {
        order: publicOrder(order),
        payment: payment
          ? {
              id: payment.id,
              provider: payment.provider,
              status: payment.status,
              clientSecret,
              checkoutUrl,
            }
          : undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    if (error instanceof DeliveryQuoteError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

function businessIdForRestaurant(restaurantId: string) {
  if (restaurantId === "restaurant-1") return "business-1";
  if (restaurantId === "restaurant-2") return "business-2";
  throw new OrderRepositoryError("Unsupported restaurant", 400);
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
