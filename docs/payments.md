# Payments

Status: Stripe test checkout, manual capture, cancellation, webhooks, full
refunds, and Supabase payment persistence are connected.

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
- `src/features/payments/server/payment-repository.ts`: Supabase payment and
  replay-safe webhook-event storage with an unconfigured local-memory fallback.
- `src/features/payments/components/StripePaymentStep.tsx`: Stripe Elements
  confirmation form using Stripe's official React integration.
- `POST /api/orders`: creates a server-priced order and manual-capture
  PaymentIntent for online payments.
- Admin acceptance captures the authorization; decline cancels it.
- `POST /api/admin/restaurants/:restaurantId/orders/:orderId/refund`: creates a
  full refund for a captured online payment.

The fallback repository resets on restart and must never be used in production.

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

## Public checkout safeguards

The test checkout enforces:

1. Menu items and options are in Supabase.
2. The browser sends identifiers and quantities, never trusted prices.
3. The server calculates integer euro cents.
4. The business is derived from the restaurant.
5. Restaurant availability is checked.
6. Request size, origin, rate limits, and idempotency keys are checked.

Supabase mode stores orders, payments, price snapshots, webhook replay records,
and idempotency records durably. Shared rate limiting and bot protection remain
required before running multiple public app instances.

The browser may receive a Stripe client secret or PayPal approval URL. It may
never receive secrets or choose the amount, merchant, currency, or capture
state.

## Stripe test-mode setup

1. Enable Stripe Connect and create one connected test account for each family
   business.
2. Copy the variables from `config/payments.env.example` into `.env.local`.
3. Add the platform test secret and publishable keys.
4. Add each connected account ID to its business-specific variable.
5. Install the Stripe CLI, sign in, and forward local test events:

   ```bash
   stripe listen --forward-connect-to localhost:3000/api/webhooks/stripe
   ```

6. Put the printed `whsec_...` value in `STRIPE_WEBHOOK_SECRET`.
7. Restart the development server after changing environment values.
8. Place an online order, confirm it, then accept or decline it in the admin
   panel.

Stripe test cards:

- Success: `4242 4242 4242 4242`
- 3D Secure: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 9995`

Use any future expiry and any three-digit CVC in test mode.

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

Customer orders may select `cash_on_site` for dine-in or takeaway. Takeaway
customers explicitly declare that they will collect the items and pay at the
restaurant. These orders create no Stripe or PayPal request and remain unpaid
until an administrator records cash collection. Delivery remains
online payment remains available for delivery. A restaurant can additionally
enable `cash_on_delivery`. This method creates an offline pending payment,
requires a German delivery address and phone number, and becomes captured only
when an administrator records that the driver collected the cash.

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
