import "server-only";

import type { MarketplaceProvider } from "../types";

export type MarketplaceOrderAction =
  | { type: "accept"; preparationMinutes: number }
  | { type: "reject"; reason: string }
  | { type: "ready" }
  | { type: "cancel"; reason: string };

export type MarketplaceOrderDetails = {
  provider: MarketplaceProvider;
  externalOrderId: string;
  externalStoreId: string;
  status: string;
  fulfillmentType: "delivery" | "pickup" | "dine_in";
  currency: "EUR";
  totalMinor: number;
  placedAt: string;
  items: Array<{
    externalItemId?: string;
    name: string;
    quantity: number;
    unitPriceMinor: number;
    modifiers: Array<{ name: string; value: string }>;
    specialInstructions?: string;
  }>;
};

/**
 * Provider adapters must implement this boundary. It keeps provider payloads,
 * tokens and state names out of the admin UI and core order domain.
 */
export interface MarketplaceConnector {
  readonly provider: MarketplaceProvider;
  fetchOrder(externalOrderId: string): Promise<MarketplaceOrderDetails>;
  applyOrderAction(
    externalOrderId: string,
    action: MarketplaceOrderAction,
    idempotencyKey: string,
  ): Promise<void>;
  setStoreAvailability(online: boolean): Promise<void>;
  updateItemAvailability(externalItemIds: string[], available: boolean): Promise<void>;
}

