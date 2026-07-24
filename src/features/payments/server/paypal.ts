import "server-only";

import type {
  PaymentAuthorizationInput,
  PaymentAuthorizationResult,
  ProviderWebhookUpdate,
} from "../types";
import { paypalConfig, type SupportedBusinessId } from "./config";
import { PaymentError, safeProviderError } from "./errors";
import type { PaymentProviderAdapter } from "./provider";

async function accessToken(businessId: SupportedBusinessId) {
  const config = paypalConfig(businessId);
  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`,
  ).toString("base64");
  const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw safeProviderError(
      "PayPal",
      response.status,
      response.headers.get("paypal-debug-id"),
    );
  }
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new PaymentError(
      "PayPal returned no access token",
      502,
      "paypal_authentication_failed",
    );
  }
  return { token: body.access_token, config };
}

async function paypalRequest(
  businessId: SupportedBusinessId,
  path: string,
  body: unknown,
  idempotencyKey: string,
) {
  const { token, config } = await accessToken(businessId);
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": idempotencyKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    throw safeProviderError(
      "PayPal",
      response.status,
      response.headers.get("paypal-debug-id"),
    );
  }
  if (response.status === 204) return {};
  return (await response.json()) as Record<string, unknown>;
}

export const paypalProvider: PaymentProviderAdapter = {
  async authorize(input: PaymentAuthorizationInput) {
    const businessId = assertBusinessId(input.businessId);
    const response = await paypalRequest(
      businessId,
      "/v2/checkout/orders",
      {
        intent: "AUTHORIZE",
        purchase_units: [
          {
            reference_id: input.orderId,
            custom_id: input.orderId,
            amount: {
              currency_code: input.currency,
              value: (input.amountMinor / 100).toFixed(2),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              return_url: input.returnUrl,
              cancel_url: input.cancelUrl,
              user_action: "PAY_NOW",
            },
          },
        },
      },
      input.idempotencyKey,
    );
    const links = Array.isArray(response.links)
      ? (response.links as Array<Record<string, unknown>>)
      : [];
    const checkoutUrl = links.find((link) => link.rel === "payer-action")?.href;
    return {
      providerPaymentId: String(response.id),
      status: paypalStatus(String(response.status)),
      checkoutUrl:
        typeof checkoutUrl === "string" ? checkoutUrl : undefined,
    } satisfies PaymentAuthorizationResult;
  },

  async capture(businessId, providerPaymentId, idempotencyKey) {
    await paypalRequest(
      businessId,
      `/v2/payments/authorizations/${encodeURIComponent(providerPaymentId)}/capture`,
      {},
      idempotencyKey,
    );
  },

  async cancel(businessId, providerPaymentId, idempotencyKey) {
    await paypalRequest(
      businessId,
      `/v2/payments/authorizations/${encodeURIComponent(providerPaymentId)}/void`,
      {},
      idempotencyKey,
    );
  },
};

export async function authorizeApprovedPayPalOrder(
  businessId: SupportedBusinessId,
  providerOrderId: string,
  idempotencyKey: string,
) {
  const response = await paypalRequest(
    businessId,
    `/v2/checkout/orders/${encodeURIComponent(providerOrderId)}/authorize`,
    {},
    idempotencyKey,
  );
  const purchaseUnits = Array.isArray(response.purchase_units)
    ? (response.purchase_units as Array<Record<string, unknown>>)
    : [];
  const payments = purchaseUnits[0]?.payments as
    | { authorizations?: Array<{ id?: string }> }
    | undefined;
  const authorizationId = payments?.authorizations?.[0]?.id;
  if (!authorizationId) {
    throw new PaymentError(
      "PayPal returned no authorization",
      502,
      "paypal_authorization_missing",
    );
  }
  return authorizationId;
}

export async function verifyPayPalWebhook(
  businessId: SupportedBusinessId,
  headers: Headers,
  event: PayPalEvent,
) {
  const { token, config } = await accessToken(businessId);
  const response = await fetch(
    `${config.baseUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: config.webhookId,
        webhook_event: event,
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw safeProviderError(
      "PayPal",
      response.status,
      response.headers.get("paypal-debug-id"),
    );
  }
  const result = (await response.json()) as { verification_status?: string };
  if (result.verification_status !== "SUCCESS") {
    throw new PaymentError(
      "Invalid PayPal webhook signature",
      400,
      "invalid_webhook_signature",
    );
  }
}

export function paypalWebhookUpdate(
  businessId: SupportedBusinessId,
  event: PayPalEvent,
): ProviderWebhookUpdate {
  const resource = event.resource;
  const relatedOrderId =
    resource.supplementary_data?.related_ids?.order_id ??
    resource.custom_id ??
    resource.id;
  return {
    eventId: `paypal:${businessId}:${event.id}`,
    providerPaymentId: relatedOrderId,
    providerAuthorizationId:
      event.event_type.startsWith("PAYMENT.AUTHORIZATION.") &&
      resource.id !== relatedOrderId
        ? resource.id
        : undefined,
    businessId,
    orderId: resource.custom_id,
    status: paypalEventStatus(event.event_type),
  };
}

export type PayPalEvent = {
  id: string;
  event_type: string;
  resource: {
    id: string;
    custom_id?: string;
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
        authorization_id?: string;
        capture_id?: string;
      };
    };
  };
};

function paypalEventStatus(type: string) {
  const statuses: Record<string, ProviderWebhookUpdate["status"]> = {
    "PAYMENT.AUTHORIZATION.CREATED": "authorized",
    "PAYMENT.AUTHORIZATION.VOIDED": "cancelled",
    "PAYMENT.AUTHORIZATION.DENIED": "failed",
    "PAYMENT.CAPTURE.COMPLETED": "captured",
    "PAYMENT.CAPTURE.DENIED": "failed",
    "PAYMENT.CAPTURE.REFUNDED": "refunded",
  };
  return statuses[type];
}

function paypalStatus(status: string): PaymentAuthorizationResult["status"] {
  if (status === "COMPLETED") return "captured";
  if (status === "VOIDED") return "cancelled";
  return "pending";
}

function assertBusinessId(businessId: string): SupportedBusinessId {
  if (businessId === "business-1" || businessId === "business-2") {
    return businessId;
  }
  throw new PaymentError("Unsupported business", 400, "unsupported_business");
}
