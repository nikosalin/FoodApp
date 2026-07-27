import "server-only";

import type {
  PaymentAuthorizationInput,
  PaymentAuthorizationResult,
} from "../types";
import type { SupportedBusinessId } from "./config";

export interface PaymentProviderAdapter {
  authorize(
    input: PaymentAuthorizationInput,
  ): Promise<PaymentAuthorizationResult>;
  capture(
    businessId: SupportedBusinessId,
    providerPaymentId: string,
    idempotencyKey: string,
  ): Promise<void>;
  cancel(
    businessId: SupportedBusinessId,
    providerPaymentId: string,
    idempotencyKey: string,
  ): Promise<void>;
  refund(
    businessId: SupportedBusinessId,
    providerPaymentId: string,
    idempotencyKey: string,
  ): Promise<void>;
}
