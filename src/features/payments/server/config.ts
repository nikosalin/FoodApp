import "server-only";

import { PaymentError } from "./errors";

const supportedBusinessIds = ["business-1", "business-2"] as const;

export type SupportedBusinessId = (typeof supportedBusinessIds)[number];

export function isSupportedBusinessId(
  businessId: string,
): businessId is SupportedBusinessId {
  return supportedBusinessIds.includes(businessId as SupportedBusinessId);
}

export function paypalCheckoutEnabled() {
  return process.env.PAYPAL_CHECKOUT_ENABLED === "true";
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new PaymentError(
      `Payment configuration is incomplete: ${name} is missing`,
      503,
      "payment_configuration_missing",
    );
  }
  return value;
}

function businessSuffix(businessId: SupportedBusinessId) {
  return businessId === "business-1" ? "BUSINESS_1" : "BUSINESS_2";
}

export function stripeConfig(businessId: SupportedBusinessId) {
  const suffix = businessSuffix(businessId);
  return {
    secretKey: required("STRIPE_SECRET_KEY"),
    connectedAccountId: required(`STRIPE_ACCOUNT_ID_${suffix}`),
    webhookSecret: required("STRIPE_WEBHOOK_SECRET"),
  };
}

export function stripeWebhookSecret() {
  return required("STRIPE_WEBHOOK_SECRET");
}

export function paypalConfig(businessId: SupportedBusinessId) {
  const suffix = businessSuffix(businessId);
  const mode = process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
  return {
    clientId: required(`PAYPAL_CLIENT_ID_${suffix}`),
    clientSecret: required(`PAYPAL_CLIENT_SECRET_${suffix}`),
    webhookId: required(`PAYPAL_WEBHOOK_ID_${suffix}`),
    baseUrl:
      mode === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com",
  };
}
