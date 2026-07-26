import { NextRequest, NextResponse } from "next/server";
import { authorizeRestaurant } from "@/features/orders/server/api";
import {
  attachOrderPayment,
  getOrder,
  OrderRepositoryError,
} from "@/features/orders/server/order-repository";
import { getOrderFromSupabase } from "@/features/orders/server/supabase-order-repository";
import {
  createPendingPayment,
  getPaymentForOrder,
  recordPaymentAudit,
  updatePaymentStatus,
} from "@/features/payments/server/payment-repository";
import { PaymentError } from "@/features/payments/server/errors";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string; orderId: string }> },
) {
  const { restaurantId, orderId } = await params;
  const authorization = authorizeRestaurant(request, restaurantId, true);
  if (authorization.error) return authorization.error;

  try {
    const usingSupabase = isSupabaseConfigured();
    const order = usingSupabase
      ? await getOrderFromSupabase(restaurantId, orderId)
      : getOrder(restaurantId, orderId);
    if (order.paymentMethod !== "cash_on_delivery") {
      return NextResponse.json(
        { error: "Only cash-on-delivery orders use this action" },
        { status: 409 },
      );
    }
    let payment = await getPaymentForOrder(order.id);
    payment ??= await createPendingPayment({
      orderId: order.id,
      businessId:
        restaurantId === "restaurant-1" ? "business-1" : "business-2",
      restaurantId,
      provider: "offline",
      method: "cash_on_delivery",
      amountMinor: Math.round(order.total * 100),
      currency: "EUR",
      idempotencyKey: `cash-collected/${order.id}`,
    });
    payment = await updatePaymentStatus(payment.id, "captured");
    await recordPaymentAudit(
      payment.id,
      authorization.session.sub,
      "payment.cash_collected",
    );
    return NextResponse.json({
      order: usingSupabase
        ? { ...order, paymentId: payment.id, paymentStatus: payment.status }
        : attachOrderPayment(restaurantId, orderId, payment),
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
