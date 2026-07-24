# Payments

Status: provider infrastructure implemented; public checkout intentionally not
enabled until authoritative menu pricing and durable Supabase persistence exist.

## Initial scope

- Germany and EUR only.
- Exactly `business-1` and `business-2`.
- Two administrators can access both businesses.
- Every restaurant belongs to one business.
- Every business owns its merchant account and receives its own payouts.
- Online providers are Stripe and PayPal.
- Offline cash, external-terminal, phone, walk-in, and daily-summary sales never
  call an online provider.

The two-business restriction is an application rule, not a database limitation.
The server must derive the business from the restaurant; never trust a
browser-supplied `businessId`.

## Lifecycle

FoodApp authorizes before the restaurant decides:

```text
pending -> authorized -> restaurant accepts -> captured
                      \-> restaurant declines -> cancelled
```

Stripe uses a PaymentIntent with `capture_method=manual`. PayPal uses an Order
with `intent=AUTHORIZE`. After PayPal redirects the customer, the server calls
`finalizePayPalAuthorization`; only then is its authorization ID available for
capture. Provider webhooks—not browser redirects—are authoritative for payment
state.

Order and payment states are separate. An order must not become accepted until
capture succeeds. A capture failure must remain visible and retryable.

## Implemented modules

- `src/features/payments/types.ts`: provider-neutral records and states.
- `src/features/payments/server/provider.ts`: adapter interface.
- `src/features/payments/server/stripe.ts`: authorize, capture, cancel, and
  signed-webhook verification.
- `src/features/payments/server/paypal.ts`: authorize, capture, void, and
  provider-side webhook verification.
- `src/features/payments/server/service.ts`: provider-neutral orchestration.
- `src/features/payments/server/payment-repository.ts`: temporary in-memory
  payment and webhook-event store.

The in-memory repository resets on restart and is not production persistence.

## Webhooks

Configure these public HTTPS endpoints:

```text
POST /api/webhooks/stripe
POST /api/webhooks/paypal/business-1
POST /api/webhooks/paypal/business-2
```

Stripe events:

```text
payment_intent.amount_capturable_updated
payment_intent.succeeded
payment_intent.canceled
payment_intent.payment_failed
```

PayPal events:

```text
PAYMENT.AUTHORIZATION.CREATED
PAYMENT.AUTHORIZATION.VOIDED
PAYMENT.AUTHORIZATION.DENIED
PAYMENT.CAPTURE.COMPLETED
PAYMENT.CAPTURE.DENIED
PAYMENT.CAPTURE.REFUNDED
```

Stripe signatures use the raw body and a five-minute timestamp tolerance.
PayPal headers and the complete event are verified with PayPal. Both handlers
limit payloads to 256 KiB and deduplicate event IDs.

Webhook responses and logs must not include raw events, customer information,
credentials, or provider response bodies.

## Secrets

Copy the variable names from `config/payments.env.example` into the deployment
secret manager. Never commit values or prefix them with `NEXT_PUBLIC_`.

Stripe uses one platform secret and a connected account ID per business.
PayPal uses separate credentials and webhook IDs per business. Sandbox and live
credentials belong in different deployment environments.

## Public checkout gate

Do not expose `authorizeOnlinePayment` to guests until:

1. Menu items and options are in Supabase.
2. The browser sends identifiers and quantities, never trusted prices.
3. The server calculates integer euro cents.
4. Order, price snapshot, payment, and idempotency records are durable.
5. Postgres enforces idempotency key plus request-hash uniqueness.
6. The business is derived from the restaurant.
7. Restaurant availability and delivery area are checked.
8. Shared rate limiting and bot protection are active.

The browser may receive a Stripe client secret or PayPal approval URL. It may
never receive secrets or choose the amount, merchant, currency, or capture
state.

## Supabase model

Minimum tables:

```text
businesses
business_admins
restaurants
orders
order_items
payments
payment_events
idempotency_keys
audit_events
```

Use integer `amount_minor` values. Add these uniqueness constraints:

```text
unique (business_id, idempotency_key)
unique (provider, provider_payment_id)
unique (provider, provider_event_id) on payment_events
```

Prefer normalized event fields over retaining complete provider payloads.

## Offline sales

Manual records use provider `offline` and method `cash`, `external_card`, or
`other`. Daily summaries must be marked as summaries and must not overlap with
individual orders. They contribute to revenue analytics but are excluded from
provider settlement and online-payment success metrics.

Every manual entry, edit, reversal, refund, capture, and cancellation needs an
immutable administrator audit event.

## Production checklist

- Complete provider verification for both legal entities.
- Confirm every restaurant maps to the intended payout account.
- Use sandbox credentials until acceptance tests pass.
- Verify webhook signatures before changing state.
- Persist replay protection and all operations idempotently.
- Reconcile captured payments with settlements daily.
- Alert on uncaptured authorizations and state mismatches.
- Restrict refunds and adjustments by role.
- Use provider-hosted fields for 3D Secure/SCA.
- Never store card numbers, CVCs, or PayPal credentials in FoodApp.

Required integration tests include duplicate checkout, changed-payload
idempotency conflicts, cross-business routing denial, duplicate/out-of-order
webhooks, capture failure, redirect spoofing, manual-order isolation, and
refunds in per-business and combined analytics.

## QR menu entry

Each active restaurant has a stable public route:

```text
/menu/<restaurant-slug>
```

The restaurant order overview generates a high-error-correction QR code for
that route. Administrators can print an A5 card, download the QR as SVG, or add
a table number. A table QR encodes only non-sensitive routing information:

```text
/menu/<restaurant-slug>?orderType=table&table=12
```

The server validates the slug, order type, and table format. QR URLs must never
contain admin credentials, payment secrets, customer data, raw database IDs, or
discount authorization. Printed codes should always be tested from a separate
phone before distribution.
