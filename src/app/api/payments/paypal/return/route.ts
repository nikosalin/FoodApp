import { NextRequest, NextResponse } from "next/server";
import { seedAdminState } from "@/features/admin/data/seed";
import {
  getOrderByTrackingToken,
} from "@/features/orders/server/order-repository";
import {
  getOrderByTrackingTokenFromSupabase,
} from "@/features/orders/server/supabase-order-repository";
import { getPaymentForOrder } from "@/features/payments/server/payment-repository";
import { finalizePayPalAuthorization } from "@/features/payments/server/service";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const trackingToken =
    request.nextUrl.searchParams.get("trackingToken") ?? "";
  const providerOrderId = request.nextUrl.searchParams.get("token") ?? "";
  const menuUrl = new URL(`/menu/${encodeURIComponent(slug)}`, request.url);

  if (
    !/^[a-z0-9-]{1,80}$/.test(slug) ||
    !/^[a-f0-9]{32}$/.test(trackingToken) ||
    !/^[A-Z0-9]{1,36}$/.test(providerOrderId)
  ) {
    menuUrl.searchParams.set("paypal", "failed");
    return NextResponse.redirect(menuUrl);
  }

  try {
    const restaurant = seedAdminState.restaurants.find(
      (candidate) => candidate.slug === slug,
    );
    const order = isSupabaseConfigured()
      ? await getOrderByTrackingTokenFromSupabase(trackingToken)
      : getOrderByTrackingToken(trackingToken);
    if (!restaurant || !order || order.restaurantId !== restaurant.id) {
      throw new Error("Order return does not match restaurant");
    }
    const payment = await getPaymentForOrder(order.id);
    if (
      !payment ||
      payment.provider !== "paypal" ||
      payment.providerPaymentId !== providerOrderId
    ) {
      throw new Error("PayPal return does not match payment");
    }
    await finalizePayPalAuthorization(payment.id);
    menuUrl.searchParams.set("paypal", "authorized");
    menuUrl.searchParams.set("trackingToken", trackingToken);
    return NextResponse.redirect(menuUrl);
  } catch {
    menuUrl.searchParams.set("paypal", "failed");
    return NextResponse.redirect(menuUrl);
  }
}
