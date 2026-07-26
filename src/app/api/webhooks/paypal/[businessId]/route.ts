import { NextRequest, NextResponse } from "next/server";
import { isSupportedBusinessId } from "@/features/payments/server/config";
import { PaymentError } from "@/features/payments/server/errors";
import {
  paypalWebhookUpdate,
  verifyPayPalWebhook,
  type PayPalEvent,
} from "@/features/payments/server/paypal";
import { applyWebhookUpdate } from "@/features/payments/server/payment-repository";

export const runtime = "nodejs";

const maxWebhookBytes = 256 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;
  if (!isSupportedBusinessId(businessId)) {
    return NextResponse.json({ error: "unknown_business" }, { status: 404 });
  }

  try {
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > maxWebhookBytes) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > maxWebhookBytes) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    const event = JSON.parse(rawBody) as PayPalEvent;
    if (!event.id || !event.event_type || !event.resource?.id) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }
    await verifyPayPalWebhook(businessId, request.headers, event);
    const result = await applyWebhookUpdate(paypalWebhookUpdate(businessId, event));
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
