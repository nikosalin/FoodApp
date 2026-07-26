import "server-only";

import type {
  OnlinePaymentProvider,
  PaymentAuthorizationInput,
} from "../types";
import { isSupportedBusinessId } from "./config";
import { PaymentError } from "./errors";
import {
  attachProviderAuthorization,
  attachProviderPayment,
  createPendingPayment,
  getPayment,
  updatePaymentStatus,
} from "./payment-repository";
import { authorizeApprovedPayPalOrder, paypalProvider } from "./paypal";
import type { PaymentProviderAdapter } from "./provider";
import { stripeProvider } from "./stripe";

const providers: Record<OnlinePaymentProvider, PaymentProviderAdapter> = {
  stripe: stripeProvider,
  paypal: paypalProvider,
};

export async function authorizeOnlinePayment(
  provider: OnlinePaymentProvider,
  input: PaymentAuthorizationInput,
) {
  validateInput(input);
  const payment = await createPendingPayment({
    orderId: input.orderId,
    businessId: input.businessId,
    restaurantId: input.restaurantId,
    provider,
    method: provider === "paypal" ? "paypal" : "card",
    amountMinor: input.amountMinor,
    currency: "EUR",
    idempotencyKey: input.idempotencyKey,
  });
  if (payment.providerPaymentId) return { payment };

  const authorization = await providers[provider].authorize(input);
  return {
    payment: await attachProviderPayment(
      payment.id,
      authorization.providerPaymentId,
      authorization.status,
    ),
    checkoutUrl: authorization.checkoutUrl,
    clientSecret: authorization.clientSecret,
  };
}

export async function captureOnlinePayment(paymentId: string) {
  const payment = await getPayment(paymentId);
  if (!isSupportedBusinessId(payment.businessId)) {
    throw new PaymentError("Unsupported business", 400, "unsupported_business");
  }
  if (payment.provider === "offline") {
    throw new PaymentError(
      "Offline payments cannot be captured online",
      409,
      "invalid_payment_provider",
    );
  }
  if (!payment.providerPaymentId) {
    throw new PaymentError(
      "Provider payment is not initialized",
      409,
      "payment_not_initialized",
    );
  }
  const captureTarget =
    payment.provider === "paypal"
      ? payment.providerAuthorizationId
      : payment.providerPaymentId;
  if (!captureTarget) {
    throw new PaymentError(
      "Provider authorization is not ready",
      409,
      "payment_not_authorized",
    );
  }
  await providers[payment.provider].capture(
    payment.businessId,
    captureTarget,
    `capture/${payment.id}`,
  );
  return await updatePaymentStatus(payment.id, "captured");
}

export async function finalizePayPalAuthorization(paymentId: string) {
  const payment = await getPayment(paymentId);
  if (
    payment.provider !== "paypal" ||
    !payment.providerPaymentId ||
    !isSupportedBusinessId(payment.businessId)
  ) {
    throw new PaymentError(
      "PayPal payment is not ready for authorization",
      409,
      "payment_not_ready",
    );
  }
  if (payment.providerAuthorizationId) return payment;
  const authorizationId = await authorizeApprovedPayPalOrder(
    payment.businessId,
    payment.providerPaymentId,
    `authorize/${payment.id}`,
  );
  return await attachProviderAuthorization(payment.id, authorizationId);
}

export async function cancelOnlinePayment(paymentId: string) {
  const payment = await getPayment(paymentId);
  if (!isSupportedBusinessId(payment.businessId)) {
    throw new PaymentError("Unsupported business", 400, "unsupported_business");
  }
  if (payment.provider === "offline") {
    throw new PaymentError(
      "Offline payments cannot be cancelled online",
      409,
      "invalid_payment_provider",
    );
  }
  if (!payment.providerPaymentId) {
    throw new PaymentError(
      "Provider payment is not initialized",
      409,
      "payment_not_initialized",
    );
  }
  if (payment.provider === "paypal" && !payment.providerAuthorizationId) {
    return await updatePaymentStatus(payment.id, "cancelled");
  }
  const cancelTarget =
    payment.provider === "paypal"
      ? payment.providerAuthorizationId
      : payment.providerPaymentId;
  if (!cancelTarget) {
    throw new PaymentError(
      "Provider authorization is not ready",
      409,
      "payment_not_authorized",
    );
  }
  await providers[payment.provider].cancel(
    payment.businessId,
    cancelTarget,
    `cancel/${payment.id}`,
  );
  return await updatePaymentStatus(payment.id, "cancelled");
}

export async function refundOnlinePayment(paymentId: string) {
  const payment = await getPayment(paymentId);
  if (
    payment.provider === "offline" ||
    !payment.providerPaymentId ||
    !isSupportedBusinessId(payment.businessId)
  ) {
    throw new PaymentError(
      "Payment is not refundable online",
      409,
      "payment_not_refundable",
    );
  }
  if (payment.status !== "captured") {
    throw new PaymentError(
      "Only captured payments can be refunded",
      409,
      "payment_not_captured",
    );
  }
  await providers[payment.provider].refund(
    payment.businessId,
    payment.providerPaymentId,
    `refund/${payment.id}`,
  );
  return await updatePaymentStatus(payment.id, "refunded");
}

function validateInput(input: PaymentAuthorizationInput) {
  if (!isSupportedBusinessId(input.businessId)) {
    throw new PaymentError("Unsupported business", 400, "unsupported_business");
  }
  if (
    !Number.isSafeInteger(input.amountMinor) ||
    input.amountMinor < 50 ||
    input.amountMinor > 1_000_000
  ) {
    throw new PaymentError("Invalid payment amount", 400, "invalid_amount");
  }
  if (input.currency !== "EUR") {
    throw new PaymentError("Only EUR is supported", 400, "unsupported_currency");
  }
  if (input.idempotencyKey.length < 16 || input.idempotencyKey.length > 100) {
    throw new PaymentError(
      "Invalid payment idempotency key",
      400,
      "invalid_idempotency_key",
    );
  }
  for (const url of [input.returnUrl, input.cancelUrl]) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production") {
      throw new PaymentError(
        "Payment return URLs must use HTTPS",
        400,
        "invalid_return_url",
      );
    }
  }
}
