import { NextRequest, NextResponse } from "next/server";
import {
  authorizeRestaurant,
  parseSmallJson,
} from "@/features/orders/server/api";
import { OrderRepositoryError } from "@/features/orders/server/order-repository";
import {
  attachOrderPayment,
  getOrder,
  updateOrderStatus,
} from "@/features/orders/server/order-repository";
import { cancelOnlinePayment } from "@/features/payments/server/service";
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
    const body = await parseSmallJson(request);
    if (
      typeof body.reason !== "string" ||
      body.reason.trim().length < 3 ||
      body.reason.length > 300
    ) {
      return NextResponse.json(
        { error: "A rejection reason between 3 and 300 characters is required" },
        { status: 400 },
      );
    }
    const usingSupabase = isSupabaseConfigured();
    const current = usingSupabase
      ? await getOrderFromSupabase(restaurantId, orderId)
      : getOrder(restaurantId, orderId);
    const paymentId =
      current.paymentId ?? (await getPaymentForOrder(current.id))?.id;
    if (current.paymentMethod === "online" && paymentId) {
      const payment = await cancelOnlinePayment(paymentId);
      if (payment && !usingSupabase) {
        attachOrderPayment(restaurantId, orderId, payment);
      }
    }
    return NextResponse.json({
      order: usingSupabase
        ? await updateOrderStatusInSupabase({
            restaurantId,
            orderId,
            status: "rejected",
            rejectionReason: body.reason,
          })
        : updateOrderStatus({
            restaurantId,
            orderId,
            status: "rejected",
            rejectionReason: body.reason,
          }),
    });
  } catch (error) {
    if (error instanceof OrderRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
