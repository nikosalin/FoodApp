# Transactional order email

FoodApp sends one transactional confirmation email when a guest order is
created. Order creation and email delivery are deliberately separate: the
database transaction commits the order and a `notification_outbox` row, then a
worker sends the email through Brevo.

## Flow

```text
create order
  -> commit order + outbox row
  -> scheduler calls protected worker endpoint
  -> worker atomically claims queued rows
  -> Brevo accepts the message
  -> outbox becomes sent
  -> authenticated Brevo webhook reports delivered/bounced
```

The worker retries temporary provider, network, and rate-limit failures with
exponential backoff. It makes at most eight attempts and reclaims jobs that
remain in `sending` for more than five minutes after a worker crash.

## Environment variables

Copy `config/email.env.example` into the deployment secret manager:

```text
BREVO_API_KEY
ORDER_EMAIL_FROM
ORDER_EMAIL_FROM_NAME
APP_BASE_URL
EMAIL_WORKER_SECRET
BREVO_WEBHOOK_TOKEN
```

`APP_BASE_URL` must be the public HTTPS origin. Generate independent,
high-entropy values for the worker and webhook secrets. Never expose the Brevo
API key or either secret through a `NEXT_PUBLIC_` variable.

## Brevo setup

1. Create the Brevo account and API key.
2. Verify the sender and sending domain used by `ORDER_EMAIL_FROM`.
3. Configure SPF, DKIM, and DMARC for the sending domain.
4. Create a transactional webhook pointing to:

   ```text
   https://<domain>/api/webhooks/brevo
   ```

5. Configure the webhook with bearer authentication. Its token must match
   `BREVO_WEBHOOK_TOKEN`.
6. Subscribe to `sent`/`request`, `delivered`, `hardBounce`, `softBounce`,
   `blocked`, `spam`, `invalid`, and `error` events.

The webhook payload is limited to 64 KiB. It stores only the provider message
ID, delivery state, and a safe error code; it does not persist raw provider
events.

## Worker scheduling

Call the following endpoint every minute from the hosting provider’s scheduler:

```text
POST /api/internal/notifications/process
Authorization: Bearer <EMAIL_WORKER_SECRET>
```

One invocation claims up to 20 messages. Claiming uses
`FOR UPDATE SKIP LOCKED`, so concurrent workers cannot send the same queued
record. The database uniqueness constraint also allows only one confirmation
event per order and channel.

Example scheduler request:

```bash
curl --request POST \
  --header "Authorization: Bearer $EMAIL_WORKER_SECRET" \
  https://<domain>/api/internal/notifications/process
```

Do not call this endpoint from the browser. The scheduler must retrieve its
secret from the deployment secret manager.

## Customer experience

The German confirmation includes:

- restaurant and order number;
- item quantities and price snapshots;
- total in EUR;
- a random, expiring order-tracking link.

The tracking page at `/orders/track/<tracking-token>` polls the safe guest
tracking API every 15 seconds. It never exposes the internal order UUID,
customer email, phone number, or delivery address.

## Acceptance test

1. Place a guest order using a Brevo-authorized test recipient.
2. Confirm one queued outbox row exists.
3. Invoke the worker with the correct bearer token.
4. Confirm the row becomes `sent` and has a provider message ID.
5. Confirm Brevo’s delivery webhook changes it to `delivered`.
6. Open the tracking link and progress the order in the admin panel.
7. Verify the page updates without sending additional routine emails.
8. Repeat with an invalid recipient and verify bounce/failure visibility in the
   outbox.

Production monitoring should alert when queued jobs are old, attempts approach
eight, or bounced/failed counts rise.
