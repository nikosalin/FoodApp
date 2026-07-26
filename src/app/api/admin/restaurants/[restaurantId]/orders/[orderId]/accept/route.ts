import { NextRequest, NextResponse } from "next/server";
import {
  authorizeRestaurant,
} from "@/features/orders/server/api";
import {
  attachOrderPayment,
  getOrder,
  OrderRepositoryError,
  updateOrderStatus,
} from "@/features/orders/server/order-repository";
import { captureOnlinePayment } from "@/features/payments/server/service";
import { PaymentError } from "@/features/payments/server/errors";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  getOrderFromSupabase,
  updateOrderStatusInSupabase,
} from "@/features/orders/server/supabase-order-repository";
import { getPaymentForOrder } from "@/features/payments/server/payment-repository";

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
    const usingSupabase = isSupabaseConfigured();
    const current = usingSupabase
      ? await getOrderFromSupabase(restaurantId, orderId)
      : getOrder(restaurantId, orderId);
    if (current.paymentMethod === "online") {
      const paymentId =
        current.paymentId ?? (await getPaymentForOrder(current.id))?.id;
      if (!paymentId) {
        throw new PaymentError(
          "Online payment is not initialized",
          409,
          "payment_not_initialized",
        );
      }
      const payment = await captureOnlinePayment(paymentId);
      if (!usingSupabase) attachOrderPayment(restaurantId, orderId, payment);
    }
    return NextResponse.json({
      order: usingSupabase
        ? await updateOrderStatusInSupabase({
            restaurantId,
            orderId,
            status: "accepted",
          })
        : updateOrderStatus({
            restaurantId,
            orderId,
            status: "accepted",
          }),
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
