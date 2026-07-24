export type PaymentProvider = "stripe" | "paypal" | "offline";

export type OnlinePaymentProvider = Exclude<PaymentProvider, "offline">;

export type PaymentMethod =
  | "card"
  | "apple_pay"
  | "google_pay"
  | "paypal"
  | "cash"
  | "external_card"
  | "other";

export type PaymentStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "cancelled"
  | "refunded"
  | "failed";

export type PaymentRecord = {
  id: string;
  orderId: string;
  businessId: string;
  restaurantId: string;
  provider: PaymentProvider;
  method: PaymentMethod;
  providerPaymentId?: string;
  providerAuthorizationId?: string;
  amountMinor: number;
  currency: "EUR";
  status: PaymentStatus;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  authorizedAt?: string;
  capturedAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  failureCode?: string;
};

export type PaymentAuthorizationInput = {
  orderId: string;
  businessId: string;
  restaurantId: string;
  amountMinor: number;
  currency: "EUR";
  idempotencyKey: string;
  returnUrl: string;
  cancelUrl: string;
};

export type PaymentAuthorizationResult = {
  providerPaymentId: string;
  providerAuthorizationId?: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  clientSecret?: string;
};

export type ProviderWebhookUpdate = {
  eventId: string;
  providerPaymentId: string;
  providerAuthorizationId?: string;
  businessId?: string;
  orderId?: string;
  status?: PaymentStatus;
  failureCode?: string;
};
