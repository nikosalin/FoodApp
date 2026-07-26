import { NextRequest, NextResponse } from "next/server";
import { stripeWebhookSecret } from "@/features/payments/server/config";
import { PaymentError } from "@/features/payments/server/errors";
import { applyWebhookUpdate } from "@/features/payments/server/payment-repository";
import { attachOrderPayment } from "@/features/orders/server/order-repository";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  stripeWebhookUpdate,
  verifyStripeWebhook,
  type StripeEvent,
} from "@/features/payments/server/stripe";

export const runtime = "nodejs";

const maxWebhookBytes = 256 * 1024;

export async function POST(request: NextRequest) {
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > maxWebhookBytes) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > maxWebhookBytes) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    verifyStripeWebhook(
      rawBody,
      request.headers.get("stripe-signature"),
      stripeWebhookSecret(),
    );
    const event = JSON.parse(rawBody) as StripeEvent;
    if (!event.id || !event.type || !event.data?.object?.id) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }
    const result = await applyWebhookUpdate(stripeWebhookUpdate(event));
    if (result.payment && !isSupabaseConfigured()) {
      attachOrderPayment(
        result.payment.restaurantId,
        result.payment.orderId,
        result.payment,
      );
    }
    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }
}
