import { NextRequest, NextResponse } from "next/server";
import { parseSmallJson, validateDeliveryAddress } from "@/features/orders/server/api";
import {
  calculateDeliveryQuote,
  DeliveryQuoteError,
} from "@/features/restaurants/server/delivery";
import { OrderRepositoryError } from "@/features/orders/server/order-repository";
import { hasValidOrigin } from "@/features/orders/server/auth";

const quoteAttempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";
  if (!allowQuote(clientKey)) {
    return NextResponse.json(
      { error: "Too many address checks. Try again later." },
      { status: 429 },
    );
  }
  try {
    const body = await parseSmallJson(request);
    const address = validateDeliveryAddress(body.address);
    const subtotal = Number(body.subtotal);
    if (!Number.isFinite(subtotal) || subtotal < 0 || subtotal > 10_000) {
      return NextResponse.json({ error: "Invalid subtotal" }, { status: 400 });
    }
    return NextResponse.json({
      quote: await calculateDeliveryQuote(restaurantId, address, subtotal),
    });
  } catch (error) {
    if (
      error instanceof DeliveryQuoteError ||
      error instanceof OrderRepositoryError
    ) {
      return NextResponse.json(
        { error: error.message, code: "code" in error ? error.code : undefined },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

function allowQuote(clientKey: string) {
  const now = Date.now();
  const current = quoteAttempts.get(clientKey);
  if (!current || current.resetAt <= now) {
    quoteAttempts.set(clientKey, { count: 1, resetAt: now + 10 * 60_000 });
    return true;
  }
  if (current.count >= 60) return false;
  current.count += 1;
  return true;
}
