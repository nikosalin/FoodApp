# Order API

The order API uses Supabase whenever the public URL and server secret are
configured. Without those variables it falls back to the process-local
repository so the interface can still be developed without Docker.

Production security, authoritative menu pricing, idempotency, OTP, and provider
decisions are tracked in
[`security-and-notifications-roadmap.md`](./security-and-notifications-roadmap.md).
Stripe and PayPal setup, lifecycle, and production gates are documented in
[`payments.md`](./payments.md).

## Authentication

`POST /api/admin/session`

```json
{
  "email": "admin@foodorder.com",
  "password": "admin123"
}
```

When Supabase is configured, login uses Supabase Auth and restaurant access is
derived from `business_admins`. The development fallback credentials work only
without Supabase configuration. Successful login sets a signed, HTTP-only,
SameSite=Strict application session cookie in addition to the Supabase session.
Configure `SESSION_SECRET` in every deployed environment. Production startup
rejects the development fallback secret.

`GET /api/admin/session` returns the current administrator.  
`DELETE /api/admin/session` logs out.

## Orders

All order routes require an authenticated session with access to the requested
restaurant.

- `GET /api/admin/restaurants/:restaurantId/orders`
- `GET /api/admin/restaurants/:restaurantId/orders/stream`
- `GET /api/admin/restaurants/:restaurantId/orders/deleted`
- `POST /api/admin/restaurants/:restaurantId/orders`
- `GET /api/admin/restaurants/:restaurantId/orders/:orderId/history`
- `PUT /api/admin/restaurants/:restaurantId/orders/:orderId`
- `DELETE /api/admin/restaurants/:restaurantId/orders/:orderId`
- `POST /api/admin/restaurants/:restaurantId/orders/:orderId/restore`
- `POST /api/admin/restaurants/:restaurantId/orders/:orderId/accept`
- `POST /api/admin/restaurants/:restaurantId/orders/:orderId/decline`
- `PATCH /api/admin/restaurants/:restaurantId/orders/:orderId`

Decline body:

```json
{ "reason": "Kitchen is at capacity" }
```

Generic status update body:

```json
{ "status": "preparing" }
```

Accepting requires a customer-facing fulfilment estimate:

```json
{ "estimateMinutes": 45 }
```

The value must be an integer from 10 to 180. It is converted to an absolute
timestamp, stored on the order, and written to immutable history with the
administrator identity.

## Allowed transitions

```text
pending -> accepted -> preparing -> ready -> completed
       \-> rejected

accepted/preparing/ready -> cancelled
```

Terminal orders cannot be reopened through the API. Declining requires a reason,
and completed, cancelled, or rejected orders receive a closing timestamp.

## Order history

Supabase stores an append-only `order_events` timeline. Database triggers and
service-only operations record creation and status changes, while application
operations add administrator-attributed edit, payment, soft-delete, and restore
events. Existing orders receive a backfilled creation event when the migration
is applied.

History rows cannot be updated or deleted. RLS allows authenticated
administrators to read events only for businesses they belong to. The history
endpoint verifies restaurant access before returning safe event details and
administrator display names.

Order deletion sets `deleted_at`; it does not physically remove the order,
items, payments, or history. Deleted orders are excluded from normal lists and
analytics, remain visible in the restaurant-scoped deleted view, and can be
restored by an authorized administrator. The admin archive supports
order/customer search plus status, payment-method, and closed-date filters.

## Guest checkout

`POST /api/orders` creates a guest order. It requires:

- An `Idempotency-Key` header between 16 and 100 characters
- Either a valid email address or phone number
- A matching preferred notification channel

Delivery customers first request an informational quote through:

```text
POST /api/restaurants/:restaurantId/delivery-quote
```

The quote returns radius, minimum basket, and delivery fee. Final order
creation independently recalculates the menu subtotal, geocodes the address,
enforces the restaurant zone, and applies the fee. See
[delivery.md](delivery.md).
- One or more menu item IDs and validated quantities
- A payment method: `online`, `cash_on_site`, `cash_on_delivery`, or
  `external_card`
- For delivery, a German street, five-digit postal code, city, and country code
  `DE`

Admin-created and guest orders use the same authoritative menu resolution.
Clients send `menuItemId` and `quantity`; the API derives the item name and
price from the selected restaurant's menu. A menu item from another restaurant,
an unknown item, or a caller-supplied replacement price is rejected/ignored.
In Supabase mode, the database RPC creates the order, immutable price snapshots,
payment row, notification outbox entry, idempotency record, and audit event in
one transaction.

`cash_on_site` is accepted only for table and takeaway orders. For takeaway it
means that the customer declares they will collect the order and pay cash at
the restaurant.

`cash_on_delivery` is a separate restaurant-controlled method. It is accepted
only for delivery orders, requires a phone number and valid German delivery
address, and is rejected when the selected restaurant has disabled it. The
customer explicitly confirms that the full amount will be paid to the driver.
Administrators explicitly mark both cash-on-site and cash-on-delivery payments
as collected through:

```text
POST /api/admin/restaurants/:restaurantId/orders/:orderId/payment-collected
```

Cash orders cannot move to `completed` until this action has captured the
offline payment record. The action is idempotent and writes a payment audit
event.

The response exposes a random tracking token instead of the internal order ID.
`GET /api/orders/track/:trackingToken` returns the safe guest-facing order
status.

## Restaurant ordering availability

Menus and QR links remain available when a restaurant stops accepting new
orders. Availability is scoped to each restaurant and evaluated in
`Europe/Berlin`.

- The default weekly schedule is `12:00–22:00`.
- Administrators can edit every weekday independently.
- **Close now** blocks new guest orders until noon the next day while existing
  orders remain manageable.
- **Open now** overrides the weekly schedule.
- **Use schedule** removes the manual override.
- Blocked restaurants never accept guest orders, even with an open override.

Public availability:

```text
GET /api/restaurants/:restaurantId/availability
```

Authenticated administration:

```text
GET   /api/admin/restaurants/:restaurantId/availability
PATCH /api/admin/restaurants/:restaurantId/availability
```

`POST /api/orders` repeats the check server-side immediately before creating
an order. A closed restaurant returns HTTP `409` with
`error: "ordering_closed"`. Admin-created phone, walk-in, and daily-summary
orders remain available because they document sales rather than accept a new
guest checkout.

Without Supabase, the development notification adapter writes events to an
in-memory outbox but does not falsely mark them delivered. In Supabase mode,
order creation writes an email event transactionally and the protected Brevo
worker processes it. See
[email.md](email.md) for provider, worker, webhook, and scheduler setup.

## Security currently enforced

- Signed, expiring HTTP-only session cookie
- SameSite=Strict and Secure cookies in production
- Same-origin checks for every mutation
- Login throttling
- Request content-type and size limits
- Restaurant-level authorization on every order operation
- Server-side input validation
- Server-side order-transition validation
- Idempotent guest order creation
- Rate-limited guest order submission
- Random, non-sequential guest tracking tokens

The in-memory repository resets when the server process restarts and must not be
used as production persistence. Supabase mode loads authoritative menu prices,
stores price snapshots, and never trusts browser-submitted amounts.
