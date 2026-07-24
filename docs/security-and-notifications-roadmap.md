# Security and notification roadmap

Status: architecture decision record for the pre-Supabase API.

## Decisions

### Menu prices are authoritative

Guest clients must never submit trusted prices. The future checkout request will
contain menu item identifiers, quantities, and selected option identifiers:

```json
{
  "restaurantId": "restaurant-id",
  "items": [
    {
      "menuItemId": "menu-item-id",
      "quantity": 2,
      "optionIds": ["large", "extra-feta"]
    }
  ]
}
```

The server must:

1. Load the restaurant and menu items from the database.
2. Confirm that every item belongs to that restaurant and is available.
3. Load option prices from the same authoritative menu.
4. Calculate subtotal, tax, discounts, and total using integer minor currency
   units rather than floating-point values.
5. Store a price snapshot with the order so later menu changes do not alter
   historical orders.
6. Reject stale, unavailable, cross-restaurant, or unknown identifiers.

Admin-created orders must also select items from the restaurant menu. Any
future manual-price adjustment requires a separate privileged workflow, a
reason, and an immutable audit event.

### Idempotency is required

Guest order creation and notification delivery must be idempotent.

The database record should contain:

```text
scope              restaurant ID or notification provider
idempotency_key    caller-provided UUID
request_hash       SHA-256 of canonical validated input
resource_id        created order or notification ID
response_body      original safe response
status             processing | completed | failed
expires_at
```

Required behavior:

- First request reserves the key atomically before creating an order.
- Same key and same request hash returns the original response.
- Same key and different request hash returns `409 Conflict`.
- Concurrent requests with the same key create at most one order.
- Keys are scoped by restaurant and operation.
- Notification keys use `<event>/<order-id>`, for example
  `order-ready/123`.
- Supabase/Postgres must enforce uniqueness with a database constraint rather
  than an in-process map.

The current prototype fails the different-payload requirement and must not be
released publicly until this is corrected.

## Contact and verification policy

Every guest order requires at least one usable contact:

- Email address, or
- International-format mobile number.

Sending a confirmation and verifying contact ownership are separate actions.
Every order receives a confirmation. OTP verification is risk-based rather than
mandatory for every diner.

Require OTP for:

- Delivery orders.
- Orders over the restaurant's configured risk threshold.
- Repeated attempts from the same device, address, or contact.
- Restaurants that explicitly enable verified-contact-only ordering.
- Suspicious behavior detected by rate limits or fraud rules.

Table and low-value takeaway orders can proceed without OTP. They still receive
an email or SMS confirmation and a random tracking token.

Verification records should store:

```text
order_id
channel
contact_hash
provider_verification_id
status
attempt_count
expires_at
verified_at
```

Never store OTP codes in plaintext. Verification start, resend, and check
operations require rate limits. Responses must not reveal whether a phone
number or email belongs to an existing user.

## Provider decision

### Administrator and restaurant accounts: Supabase Auth

Use Supabase Auth for real accounts, sessions, passwordless login, and MFA.
Authorization belongs in Postgres Row Level Security policies. Guest diners
should not automatically become Supabase Auth users merely to place an order.

Supabase supports email OTP and phone authentication through providers including
Twilio, MessageBird, and Vonage:

- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/auth/auth-mfa/phone

Production Supabase Auth email requires custom SMTP. Supabase lists Resend,
Postmark, AWS SES, SendGrid, Brevo, and others as compatible:

- https://supabase.com/docs/guides/auth/auth-smtp

### Transactional email: Brevo initially; Amazon SES when needed

Send one email when an order is created. It contains the receipt and secure
tracking link; ordinary status changes appear on the tracking page. A declined
order can be treated as an explicit second-email exception because the customer
needs an active warning.

Brevo's free allowance covers the expected initial daily volume. Move to Amazon
SES when daily peaks or delivery requirements outgrow that allowance. Keep the
outbox provider-neutral so the switch does not affect order processing.

Use a verified transactional subdomain such as `orders.example.com`. Configure
SPF, DKIM, and DMARC, and process delivery and bounce events idempotently.
Marketing messages require a separate stream/domain and separate consent.

### Phone OTP: Twilio Verify

Use Twilio Verify when the risk policy requires proof that a guest possesses a
phone number.

Reasons:

- Purpose-built verification lifecycle.
- SMS and WhatsApp verification channels.
- Service-level rate limits and platform fraud protections.
- Managed OTP lifetime and verification checks.

References:

- https://www.twilio.com/docs/verify
- https://www.twilio.com/docs/verify/api/service-rate-limits
- https://www.twilio.com/docs/verify/api/rate-limits-and-timeouts

Do not build or store SMS OTP codes ourselves.

### Transactional SMS: Twilio Messaging

Ordinary order confirmations and status notifications are messaging events, not
verification events. Send those through Twilio Messaging. Use Twilio Verify only
for OTP challenges. Keep messages within one SMS segment where possible and
store provider delivery identifiers.

### Alternative email providers: Resend or Postmark

Postmark is the fallback if operational delivery reporting and separate
transactional message streams are preferred. It provides delivery, bounce, open,
click, and complaint webhooks. Its webhook protection model differs from
Resend's signed webhooks, so it should not be treated as a drop-in security
equivalent.

References:

- https://postmarkapp.com/developer/
- https://postmarkapp.com/developer/webhooks/webhooks-overview

## Notification architecture

Order mutations commit before provider calls:

```text
API transaction
  ├─ write order/status
  └─ write outbox event
           ↓
       background worker
           ↓
    Brevo, SES, Resend, or Postmark API
           ↓
       signed webhook
           ↓
 update delivery status
```

The database transaction must write the order change and outbox event together.
Provider outages must not roll back valid orders. Workers retry transient errors
with backoff and provider idempotency keys. Permanent failures are visible to
restaurant staff and can be retried manually.

Notification states:

```text
queued -> sending -> sent -> delivered
                    \-> bounced
                    \-> failed
```

Webhook handlers must:

- Verify the provider signature before parsing or trusting the event.
- Reject stale timestamps where supported.
- Deduplicate provider event IDs.
- Avoid logging message bodies, full email addresses, phone numbers, or secrets.
- Return quickly and process asynchronously.

## Security backlog

### Blockers before public guest ordering

- Replace client-provided prices with authoritative menu lookup.
- Persist idempotency keys with request hashes and atomic uniqueness.
- Enforce actual streamed request-body limits; do not trust only
  `Content-Length`.
- Replace hard-coded administrator credentials.
- Configure a strong `SESSION_SECRET` and maintained session/auth library.
- Add shared, trusted-proxy-aware rate limiting.
- Add order audit events and soft deletion.

### Required before production

- Supabase Auth for staff and restaurant accounts.
- RLS policies for restaurant ownership on every table.
- Short-lived sessions and server-side permission checks.
- CAPTCHA or bot protection on public order and OTP start endpoints.
- Rate limits per IP, contact hash, restaurant, device, and verification ID.
- Connection limits for order event streams.
- Content Security Policy and standard security response headers.
- Secrets only in environment/secret management, with rotation procedures.
- Structured security logs with PII redaction.
- Signed provider webhook verification and replay protection.
- Data retention/deletion rules for guest contact information.
- Backups, migration tests, and incident response procedures.

## Proposed environment variables

```text
SESSION_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
BREVO_API_KEY
BREVO_WEBHOOK_SECRET
ORDER_EMAIL_FROM
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID
TWILIO_MESSAGING_SERVICE_SID
```

Service-role, email-provider, and Twilio secrets are server-only and must never use a
`NEXT_PUBLIC_` prefix.

## Delivery phases

1. Implement database menu pricing and persistent idempotency.
2. Add Supabase Auth and RLS for restaurant staff.
3. Implement the Postgres outbox and background worker.
4. Connect Brevo or SES email and verify provider webhooks.
5. Add Twilio Verify for risk-based OTP.
6. Add Twilio Messaging for SMS order status notifications.
7. Add dashboards for delivery failures, resend, and audit history.
8. Run abuse, authorization, concurrency, and webhook replay tests before
   enabling public ordering.
