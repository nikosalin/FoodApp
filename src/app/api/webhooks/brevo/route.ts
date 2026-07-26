import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { hasBearerSecret } from "@/features/notifications/server/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  if (!hasBearerSecret(request, process.env.BREVO_WEBHOOK_TOKEN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const eventName = typeof event.event === "string" ? event.event : "";
  const messageId =
    typeof event["message-id"] === "string" ? event["message-id"] : "";
  if (!messageId || messageId.length > 255) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }
  const status = statusForEvent(eventName);
  if (!status) return new NextResponse(null, { status: 204 });
  const client = getAdminSupabase();
  if (!client) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  const { error } = await client
    .from("notification_outbox")
    .update({
      status,
      last_error_code:
        status === "bounced" || status === "failed"
          ? `brevo_${eventName}`.slice(0, 100)
          : null,
    })
    .eq("provider_message_id", messageId);
  if (error) {
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}

function statusForEvent(
  event: string,
): "sent" | "delivered" | "bounced" | "failed" | null {
  if (event === "request") return "sent";
  if (event === "delivered") return "delivered";
  if (
    event === "hard_bounce" ||
    event === "soft_bounce" ||
    event === "invalid" ||
    event === "blocked" ||
    event === "spam"
  ) {
    return "bounced";
  }
  if (event === "error") return "failed";
  return null;
}
