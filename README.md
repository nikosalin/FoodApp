# FoodApp

FoodApp is a restaurant ordering and administration platform for two family
businesses in Germany. Customers can open a restaurant-specific menu from a QR
code, place an order, and track it. Two administrator accounts can manage both
restaurants, while orders, availability, payments, and analytics remain scoped
to the selected restaurant.

The application supports a Supabase-backed local environment and a
development fallback that runs without Supabase. Stripe checkout is ready for
test credentials. PayPal has a server-side integration scaffold, but its
customer checkout flow still needs to be connected.

## Customer ordering

- Public restaurant menu at `/menu/[slug]`.
- Restaurant-specific categories, item cards, prices, and cart.
- Dine-in/table, takeaway, and home-delivery fulfilment.
- Guest checkout with an email address for confirmation and secure order
  tracking.
- Cash on site for dine-in and pickup orders.
- Cash on delivery, enabled or disabled independently for each restaurant.
- German delivery-address validation and a required phone number for cash on
  delivery.
- Stripe Elements checkout for online card payments.
- Menu-authoritative pricing: the API recalculates prices and totals instead of
  trusting browser-submitted amounts.
- Printable A5 restaurant QR sheet, SVG download, and optional table number in
  the menu URL.
- Restaurant opening state is shown before checkout, and closed restaurants
  reject new orders at the API boundary.

## Admin panel

- Admin sign-in with Supabase Auth when configured, with a local development
  fallback.
- Two seeded administrators can access both seeded businesses and restaurants.
- Restaurant selector keeps operational views and analytics restaurant-specific.
- Pending and closed order queues with daily revenue totals.
- Status workflow: pending, accepted, preparing, ready, completed, declined, and
  cancelled.
- Accept or decline incoming orders and progress accepted orders through
  preparation.
- Create orders directly from compact menu-item cards; server menu prices are
  used automatically.
- Edit or delete eligible manual orders without using the customer menu.
- Record cash, external card, and manually entered sales for analytics without
  creating an online payment.
- Capture or cancel authorized online payments, issue refunds, and record cash
  collection for cash-on-delivery orders.
- Per-restaurant weekly opening hours, manual open/close override, and early
  closure until the next opening period.
- Per-restaurant cash-on-delivery switch.
- Restaurant QR-code generation and print layout.
- Audit records for sensitive order and payment changes.

## Analytics

Analytics always use the currently selected restaurant; revenue from the two
businesses is not mixed unless a future combined view is added deliberately.
Only completed orders contribute to sales metrics.

- Today, last 7 days, and month time ranges.
- Revenue, completed-order count, average order value, and peak sales hour.
- Revenue wave/area graph over time.
- Sales-by-hour chart for operational decisions.
- Daily revenue and order totals.
- Monday-to-Sunday analysis across the available completed-order history.
- Weekday revenue, orders, number of observed dates, average revenue per
  weekday, and average orders per weekday.
- Best-performing weekday indicator.
- Cash-paid, card-paid, and awaiting-payment revenue with order counts and
  percentages for the selected period.
- Monday-to-Sunday × 24-hour workload heatmap with average orders, paid
  revenue, and the strongest recurring staffing window.
- Dates and weekdays are calculated in `Europe/Berlin`.

## Payments

- Stripe PaymentIntents use manual capture: customer checkout authorizes the
  amount, admin acceptance captures it, and decline cancels it.
- This authorization-first flow avoids charging customers for ordinary
  restaurant declines; refunds are reserved for cancellations after capture.
- Stripe Connect configuration supports a separate connected account for each
  business.
- Stripe webhook verification and idempotent event processing.
- Refund endpoint and admin action.
- PayPal authorization/capture/void server adapter and business-specific
  verified webhook routes.
- Separate PayPal merchant credentials are supported for each business.
- Offline methods include cash on site, cash on delivery, and admin-recorded
  external card payments.
- FoodApp never stores card numbers or CVC values.

See [docs/payments.md](docs/payments.md) for lifecycle diagrams, environment
variables, test cards, webhook setup, and remaining production steps.

## Orders, API security, and notifications

- Public order creation, guest tracking, admin order management, availability,
  payment-action, and webhook APIs.
- Idempotency keys protect order creation and payment operations from duplicate
  requests.
- Request validation, body-size limits, rate limiting, origin checks, and
  restaurant-membership authorization.
- Random guest tracking tokens are stored as hashes with expiry.
- Supabase Row Level Security separates public, member, and service-role access.
- Database transactions create orders, items, payment state, notification
  outbox entries, idempotency records, and audit events together.
- A provider-neutral outbox keeps order creation independent from email-provider
  availability.
- The intended customer notification is one confirmation email. A real
  transactional email provider and worker still need to be connected for
  production.

See [docs/order-api.md](docs/order-api.md) for request and response details, and
[docs/security-and-notifications-roadmap.md](docs/security-and-notifications-roadmap.md)
for the production security and email plan.

## Data layer

Supabase migrations and seed data provide:

- businesses, restaurants, profiles, and business memberships;
- opening hours and restaurant availability overrides;
- menu categories and menu items;
- orders, order items, payments, and payment events;
- notification outbox, idempotency records, and audit events;
- transactional functions for creating and updating orders from menu items;
- Row Level Security policies and service-only order operations.

When Supabase environment variables are absent, the app uses an in-memory
development repository. That mode is convenient for interface work but is not
persistent or suitable for production.

## Technology

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS
- Supabase Auth and Postgres
- Stripe Elements and Stripe Connect
- PayPal REST adapter
- Recharts
- `qrcode.react`
- i18next

## Local setup

Requirements: Node.js/npm, Docker, and the Supabase CLI.

```bash
npm install
npm run supabase:start
npm run supabase:status
```

Create `.env.local` from the examples in `config/`:

```bash
cp config/supabase.env.example .env.local
```

Replace the placeholder Supabase values with the local values printed by
`npm run supabase:status`. Add the variables from
`config/payments.env.example` when testing Stripe or PayPal. Never commit real
secret keys.

Then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The admin login is at
[http://localhost:3000/admin/login](http://localhost:3000/admin/login).

### Seeded local administrators

| Email | Password |
| --- | --- |
| `admin.one@foodapp.local` | `local-admin-one` |
| `admin.two@foodapp.local` | `local-admin-two` |

If Supabase is not configured, the fallback development login is
`admin@foodorder.com` / `admin123`.

For database reset, local email inspection, schema details, and deployment
guidance, see
[docs/supabase-local-development.md](docs/supabase-local-development.md).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check without emitting files |
| `npm run interface` | Regenerate i18next resource types |
| `npm run supabase:start` | Start the local Supabase stack |
| `npm run supabase:stop` | Stop the local Supabase stack |
| `npm run supabase:status` | Print local service URLs and keys |
| `npm run supabase:reset` | Rebuild and reseed the local database |
| `npm run supabase:lint` | Lint the local database schema |

## Production checklist

The following integrations deliberately remain configuration or finishing
steps:

- supply live Stripe platform and connected-account credentials;
- register and verify production Stripe webhooks;
- connect the PayPal approval flow to the customer checkout UI and configure
  each business merchant account;
- connect an email provider and worker to the notification outbox;
- replace process-local rate limiting with a shared store for multi-instance
  deployment;
- configure production Supabase, SMTP, domains, secrets, and monitoring;
- run full payment, refund, webhook, email, and role-based acceptance tests.
