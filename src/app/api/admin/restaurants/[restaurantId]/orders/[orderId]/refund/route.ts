import { NextRequest, NextResponse } from "next/server";
import { authorizeRestaurant } from "@/features/orders/server/api";
import {
  attachOrderPayment,
  getOrder,
  OrderRepositoryError,
} from "@/features/orders/server/order-repository";
import { PaymentError } from "@/features/payments/server/errors";
import { refundOnlinePayment } from "@/features/payments/server/service";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  getOrderFromSupabase,
  recordOrderEvent,
} from "@/features/orders/server/supabase-order-repository";
import { getPaymentForOrder } from "@/features/payments/server/payment-repository";

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
    const paymentId =
      order.paymentId ?? (await getPaymentForOrder(order.id))?.id;
    if (!paymentId) {
      throw new PaymentError(
        "Payment is not initialized",
        409,
        "payment_not_initialized",
      );
    }
    const payment = await refundOnlinePayment(paymentId);
    if (usingSupabase) {
      await recordOrderEvent({
        restaurantId,
        orderId,
        actorUserId: authorization.session.sub,
        eventType: "payment.refunded",
        details: { paymentId: payment.id },
      });
    }
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
