# Marketplace integrations

FoodApp has a provider-neutral foundation for Wolt, Uber Eats, and
Lieferando/JET Connect. The foundation does not enable a live integration by
itself. Each provider must issue sandbox credentials, approve the integration,
and provision a test store.

## Safety boundary

- Credentials remain server-only in the deployment secret manager.
- Marketplace payments are recorded as provider-managed and never captured
  through FoodApp's Stripe integration.
- Webhooks are authenticated before parsing or persistence.
- Full webhook payloads and customer details are not retained in the event log.
- Event IDs are unique per provider for replay protection.
- Provider actions must use the connector contract and idempotency keys.

## Setup order

1. Apply `202608110001_marketplace_channels.sql` to Supabase.
2. Copy variable names from `config/marketplaces.env.example` into the sandbox
   or Preview environment.
3. Insert one `marketplace_connections` row for the provider's test store and
   the matching FoodApp restaurant.
4. Deploy the relevant webhook URL shown in Admin → Delivery Channels.
5. Complete provider sandbox webhook and order-lifecycle test cases.
6. Implement and certify the provider adapter behind `MarketplaceConnector`.
7. Create separate production credentials and connection rows only after the
   sandbox pilot passes.

## Current implementation status

Implemented: schema, RLS, configuration health, signed webhook ingestion,
deduplicated safe events, admin channel overview, and normalized connector
contracts.

Pending credentials/certification: fetching full orders, accepting/rejecting,
marking ready, menu synchronization, store availability, reconciliation, and
provider-specific recovery polling.
