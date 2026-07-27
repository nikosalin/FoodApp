import "server-only";

import type { Json, TableRow } from "@/types/database";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { EmailProviderError, sendBrevoEmail } from "./brevo";

type NotificationJob = TableRow<"notification_outbox">;

export async function processEmailOutbox(limit = 20) {
  const client = getAdminSupabase();
  if (!client) throw new Error("Supabase is not configured");
  const { data, error } = await client.rpc("claim_notification_jobs", {
    p_limit: Math.min(Math.max(limit, 1), 50),
  });
  if (error) throw new Error("Unable to claim notification jobs");

  const results = await Promise.allSettled(
    (data ?? []).map((job) => processJob(job)),
  );
  return {
    claimed: results.length,
    sent: results.filter(
      (result) => result.status === "fulfilled" && result.value === "sent",
    ).length,
    failed: results.filter(
      (result) => result.status === "fulfilled" && result.value === "failed",
    ).length,
    errors: results.filter((result) => result.status === "rejected").length,
  };
}

async function processJob(job: NotificationJob): Promise<"sent" | "failed"> {
  const client = getAdminSupabase();
  if (!client) throw new Error("Supabase is not configured");

  try {
    if (job.channel !== "email" || job.event_type !== "order_created") {
      throw new EmailProviderError("unsupported_notification", false);
    }
    const email = await buildOrderConfirmation(job);
    const result = await sendBrevoEmail({
      recipient: job.recipient,
      ...email,
      tag: `foodapp-order-${job.id}`,
    });
    const { error } = await client
      .from("notification_outbox")
      .update({
        status: "sent",
        provider_message_id: result.messageId,
        last_error_code: null,
      })
      .eq("id", job.id)
      .eq("status", "sending");
    if (error) throw new Error("Unable to mark notification sent");
    return "sent";
  } catch (error) {
    const providerError =
      error instanceof EmailProviderError
        ? error
        : new EmailProviderError("email_worker_error", true);
    const delayMinutes = providerError.retryable
      ? Math.min(2 ** Math.max(job.attempt_count - 1, 0), 60)
      : 24 * 60;
    await client
      .from("notification_outbox")
      .update({
        status: "failed",
        last_error_code: providerError.code.slice(0, 100),
        next_attempt_at: new Date(
          Date.now() + delayMinutes * 60_000,
        ).toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "sending");
    return "failed";
  }
}

async function buildOrderConfirmation(job: NotificationJob) {
  const client = getAdminSupabase();
  if (!client || !job.order_id) {
    throw new EmailProviderError("order_not_found", false);
  }
  const orderResult = await client
    .from("orders")
    .select("order_number, restaurant_id, total_minor, delivery_fee_minor")
    .eq("id", job.order_id)
    .maybeSingle();
  if (orderResult.error || !orderResult.data) {
    throw new EmailProviderError("order_not_found", false);
  }
  const [restaurantResult, itemsResult] = await Promise.all([
    client
      .from("restaurants")
      .select("name")
      .eq("id", orderResult.data.restaurant_id)
      .maybeSingle(),
    client
      .from("order_items")
      .select("name_snapshot, quantity, line_total_minor")
      .eq("order_id", job.order_id)
      .order("created_at"),
  ]);
  if (
    restaurantResult.error ||
    !restaurantResult.data ||
    itemsResult.error
  ) {
    throw new EmailProviderError("order_email_data_unavailable", true);
  }

  const template = asObject(job.template_data);
  const trackingToken =
    typeof template.trackingToken === "string" ? template.trackingToken : "";
  if (!/^[a-f0-9]{32,64}$/.test(trackingToken)) {
    throw new EmailProviderError("tracking_token_missing", false);
  }
  const baseUrl = requiredBaseUrl();
  const trackingUrl = `${baseUrl}/orders/track/${encodeURIComponent(
    trackingToken,
  )}`;
  const orderNumber = orderResult.data.order_number;
  const restaurantName = restaurantResult.data.name;
  const itemLines = (itemsResult.data ?? []).map(
    (item) =>
      `${item.quantity} × ${item.name_snapshot} — ${currency(
        item.line_total_minor,
      )}`,
  );
  const escapedItems = (itemsResult.data ?? [])
    .map(
      (item) =>
        `<li>${item.quantity} × ${escapeHtml(
          item.name_snapshot,
        )} — ${currency(item.line_total_minor)}</li>`,
    )
    .join("");

  return {
    subject: `Bestellung ${orderNumber} bestätigt`,
    textContent: [
      `Vielen Dank für deine Bestellung bei ${restaurantName}.`,
      `Bestellnummer: ${orderNumber}`,
      "",
      ...itemLines,
      ...(orderResult.data.delivery_fee_minor > 0
        ? [`Liefergebühr: ${currency(orderResult.data.delivery_fee_minor)}`]
        : []),
      "",
      `Gesamt: ${currency(orderResult.data.total_minor)}`,
      `Status ansehen: ${trackingUrl}`,
    ].join("\n"),
    htmlContent: `<h1>Bestellung bestätigt</h1>
<p>Vielen Dank für deine Bestellung bei <strong>${escapeHtml(
      restaurantName,
    )}</strong>.</p>
<p>Bestellnummer: <strong>${escapeHtml(orderNumber)}</strong></p>
<ul>${escapedItems}</ul>
${orderResult.data.delivery_fee_minor > 0 ? `<p>Liefergebühr: ${currency(orderResult.data.delivery_fee_minor)}</p>` : ""}
<p>Gesamt: <strong>${currency(orderResult.data.total_minor)}</strong></p>
<p><a href="${escapeHtml(trackingUrl)}">Bestellstatus ansehen</a></p>`,
  };
}

function asObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function requiredBaseUrl() {
  const raw = process.env.APP_BASE_URL?.trim();
  if (!raw) throw new EmailProviderError("app_base_url_missing", false);
  const url = new URL(raw);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new EmailProviderError("app_base_url_insecure", false);
  }
  return url.origin;
}

function currency(amountMinor: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amountMinor / 100);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
