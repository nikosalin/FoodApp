export const marketplaceProviders = ["wolt", "uber_eats", "lieferando"] as const;

export type MarketplaceProvider = (typeof marketplaceProviders)[number];
export type MarketplaceMode = "sandbox" | "production";

export type MarketplaceProviderStatus = {
  provider: MarketplaceProvider;
  label: string;
  mode: MarketplaceMode;
  configured: boolean;
  missingVariables: string[];
  webhookPath: string;
  capabilities: string[];
};

export type MarketplaceConnection = {
  id: string;
  provider: MarketplaceProvider;
  external_store_id: string;
  display_name: string;
  status: "disconnected" | "sandbox" | "active" | "degraded" | "disabled";
  last_event_at: string | null;
  last_sync_at: string | null;
  last_error_code: string | null;
};

export type MarketplaceOrderSummary = {
  id: string;
  provider: MarketplaceProvider;
  external_order_id: string;
  display_order_id: string | null;
  status: string;
  fulfillment_type: string;
  total_minor: number;
  currency: string;
  preparation_minutes: number | null;
  placed_at: string;
};

export type MarketplaceDashboardData = {
  providers: MarketplaceProviderStatus[];
  connections: MarketplaceConnection[];
  orders: MarketplaceOrderSummary[];
  warning?: string;
};
