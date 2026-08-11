import "server-only";

import type {
  MarketplaceMode,
  MarketplaceProvider,
  MarketplaceProviderStatus,
} from "../types";

const definitions: Record<MarketplaceProvider, {
  label: string;
  variables: string[];
  capabilities: string[];
}> = {
  wolt: {
    label: "Wolt",
    variables: ["WOLT_CLIENT_ID", "WOLT_CLIENT_SECRET", "WOLT_VENUE_ID"],
    capabilities: ["Orders", "Menu", "Availability", "Preparation status"],
  },
  uber_eats: {
    label: "Uber Eats",
    variables: [
      "UBER_EATS_CLIENT_ID",
      "UBER_EATS_CLIENT_SECRET",
      "UBER_EATS_STORE_ID",
    ],
    capabilities: ["Orders", "Menu", "Store status", "Reports"],
  },
  lieferando: {
    label: "Lieferando",
    variables: [
      "JET_CONNECT_API_KEY",
      "JET_CONNECT_RESTAURANT_ID",
      "JET_CONNECT_WEBHOOK_TOKEN",
    ],
    capabilities: ["Order injection", "Menu", "Cancellations", "Item availability"],
  },
};

export function marketplaceProviderStatuses(): MarketplaceProviderStatus[] {
  return (Object.entries(definitions) as [MarketplaceProvider, typeof definitions.wolt][])
    .map(([provider, definition]) => {
      const missingVariables = definition.variables.filter(
        (name) => !process.env[name]?.trim(),
      );
      return {
        provider,
        label: definition.label,
        mode: providerMode(provider),
        configured: missingVariables.length === 0,
        missingVariables,
        webhookPath: `/api/webhooks/marketplaces/${provider}`,
        capabilities: definition.capabilities,
      };
    });
}

export function providerMode(provider: MarketplaceProvider): MarketplaceMode {
  const value = process.env[`${providerEnvPrefix(provider)}_MODE`];
  return value === "production" ? "production" : "sandbox";
}

export function providerWebhookSecret(provider: MarketplaceProvider) {
  const name =
    provider === "wolt"
      ? "WOLT_CLIENT_SECRET"
      : provider === "uber_eats"
        ? "UBER_EATS_CLIENT_SECRET"
        : "JET_CONNECT_WEBHOOK_TOKEN";
  return process.env[name]?.trim() ?? "";
}

function providerEnvPrefix(provider: MarketplaceProvider) {
  if (provider === "wolt") return "WOLT";
  if (provider === "uber_eats") return "UBER_EATS";
  return "JET_CONNECT";
}

