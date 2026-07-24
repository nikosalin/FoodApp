import "server-only";

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly status = 500,
    readonly code = "payment_error",
  ) {
    super(message);
  }
}

export function safeProviderError(
  provider: string,
  responseStatus: number,
  requestId?: string | null,
) {
  const reference = requestId ? ` Reference: ${requestId}.` : "";
  return new PaymentError(
    `${provider} rejected the payment request.${reference}`,
    responseStatus >= 400 && responseStatus < 500 ? 422 : 502,
    `${provider.toLowerCase()}_request_failed`,
  );
}
