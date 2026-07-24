# Order API

The order API currently uses a process-local in-memory repository. Its public
contract is intentionally independent from storage so the repository can later
be replaced with Supabase.

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

Successful login sets a signed, HTTP-only, SameSite=Strict session cookie.
Configure `SESSION_SECRET` in every deployed environment. Production startup
rejects the development fallback secret.

`GET /api/admin/session` returns the current administrator.  
`DELETE /api/admin/session` logs out.

## Orders

All order routes require an authenticated session with access to the requested
restaurant.

- `GET /api/admin/restaurants/:restaurantId/orders`
- `GET /api/admin/restaurants/:restaurantId/orders/stream`
- `POST /api/admin/restaurants/:restaurantId/orders`
- `PUT /api/admin/restaurants/:restaurantId/orders/:orderId`
- `DELETE /api/admin/restaurants/:restaurantId/orders/:orderId`
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

## Allowed transitions

```text
pending -> accepted -> preparing -> ready -> completed
       \-> rejected

accepted/preparing/ready -> cancelled
```

Terminal orders cannot be reopened through the API. Declining requires a reason,
and completed, cancelled, or rejected orders receive a closing timestamp.

## Guest checkout

`POST /api/orders` creates a guest order. It requires:

- An `Idempotency-Key` header between 16 and 100 characters
- Either a valid email address or phone number
- A matching preferred notification channel
- One or more menu item IDs and validated quantities

Admin-created and guest orders use the same authoritative menu resolution.
Clients send `menuItemId` and `quantity`; the API derives the item name and
price from the selected restaurant's menu. A menu item from another restaurant,
an unknown item, or a caller-supplied replacement price is rejected/ignored.

The response exposes a random tracking token instead of the internal order ID.
`GET /api/orders/track/:trackingToken` returns the safe guest-facing order
status.

The current development notification adapter writes email/SMS events to an
in-memory outbox and marks them sent asynchronously. Replace
`src/features/orders/server/notifications.ts` with Resend/Twilio provider
adapters later.

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
used as production persistence. With Supabase, replace
`src/features/orders/server/order-repository.ts`; keep the route and client
contracts stable.

Guest item prices are accepted by the prototype because no menu repository
exists yet. The Supabase implementation must load authoritative menu prices on
the server and never trust prices submitted by a browser.
