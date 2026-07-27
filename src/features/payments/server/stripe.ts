import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaymentAuthorizationInput,
  PaymentAuthorizationResult,
  ProviderWebhookUpdate,
} from "../types";
import { stripeConfig, type SupportedBusinessId } from "./config";
import { PaymentError, safeProviderError } from "./errors";
import type { PaymentProviderAdapter } from "./provider";

const stripeApiUrl = "https://api.stripe.com/v1";

async function stripeRequest(
  businessId: SupportedBusinessId,
  path: string,
  body: URLSearchParams,
  idempotencyKey: string,
) {
  const config = stripeConfig(businessId);
  const response = await fetch(`${stripeApiUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
      "Stripe-Account": config.connectedAccountId,
    },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    throw safeProviderError(
      "Stripe",
      response.status,
      response.headers.get("request-id"),
    );
  }
  return (await response.json()) as Record<string, unknown>;
}

export const stripeProvider: PaymentProviderAdapter = {
  async authorize(input: PaymentAuthorizationInput) {
    const businessId = assertBusinessId(input.businessId);
    const response = await stripeRequest(
      businessId,
      "/payment_intents",
      new URLSearchParams({
        amount: String(input.amountMinor),
        currency: input.currency.toLowerCase(),
        capture_method: "manual",
        "automatic_payment_methods[enabled]": "true",
        "metadata[order_id]": input.orderId,
        "metadata[business_id]": input.businessId,
        "metadata[restaurant_id]": input.restaurantId,
      }),
      input.idempotencyKey,
    );
    return {
      providerPaymentId: String(response.id),
      status: stripeStatus(String(response.status)),
      clientSecret:
        typeof response.client_secret === "string"
          ? response.client_secret
          : undefined,
    } satisfies PaymentAuthorizationResult;
  },

  async capture(businessId, providerPaymentId, idempotencyKey) {
    await stripeRequest(
      businessId,
      `/payment_intents/${encodeURIComponent(providerPaymentId)}/capture`,
      new URLSearchParams(),
      idempotencyKey,
    );
  },

  async cancel(businessId, providerPaymentId, idempotencyKey) {
    await stripeRequest(
      businessId,
      `/payment_intents/${encodeURIComponent(providerPaymentId)}/cancel`,
      new URLSearchParams(),
      idempotencyKey,
    );
  },

  async refund(businessId, providerPaymentId, idempotencyKey) {
    await stripeRequest(
      businessId,
      "/refunds",
      new URLSearchParams({ payment_intent: providerPaymentId }),
      idempotencyKey,
    );
  },
};

export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  toleranceSeconds = 300,
) {
  if (!signatureHeader) {
    throw new PaymentError(
      "Missing Stripe signature",
      400,
      "invalid_webhook_signature",
    );
  }
  const fields = signatureHeader.split(",").map((field) => field.split("="));
  const timestamp = fields.find(([key]) => key === "t")?.[1];
  const signatures = fields
    .filter(([key]) => key === "v1")
    .map(([, value]) => value);
  if (!timestamp || signatures.length === 0) {
    throw new PaymentError(
      "Malformed Stripe signature",
      400,
      "invalid_webhook_signature",
    );
  }
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds) {
    throw new PaymentError(
      "Stale Stripe webhook",
      400,
      "stale_webhook",
    );
  }

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest();
  const valid = signatures.some((signature) => {
    try {
      const received = Buffer.from(signature, "hex");
      return received.length === expected.length && timingSafeEqual(received, expected);
    } catch {
      return false;
    }
  });
  if (!valid) {
    throw new PaymentError(
      "Invalid Stripe signature",
      400,
      "invalid_webhook_signature",
    );
  }
}

export function stripeWebhookUpdate(event: StripeEvent): ProviderWebhookUpdate {
  const object = event.data.object;
  return {
    eventId: `stripe:${event.id}`,
    providerPaymentId: object.id,
    businessId: object.metadata?.business_id,
    orderId: object.metadata?.order_id,
    status: stripeEventStatus(event.type),
    failureCode: object.last_payment_error?.code,
  };
}

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      metadata?: Record<string, string>;
      last_payment_error?: { code?: string };
    };
  };
};

function stripeEventStatus(type: string) {
  const statuses: Record<string, ProviderWebhookUpdate["status"]> = {
    "payment_intent.amount_capturable_updated": "authorized",
    "payment_intent.succeeded": "captured",
    "payment_intent.canceled": "cancelled",
    "payment_intent.payment_failed": "failed",
  };
  return statuses[type];
}

function stripeStatus(status: string): PaymentAuthorizationResult["status"] {
  if (status === "requires_capture") return "authorized";
  if (status === "succeeded") return "captured";
  if (status === "canceled") return "cancelled";
  return "pending";
}

function assertBusinessId(businessId: string): SupportedBusinessId {
  if (businessId === "business-1" || businessId === "business-2") {
    return businessId;
  }
  throw new PaymentError("Unsupported business", 400, "unsupported_business");
}

export type { StripeEvent };
