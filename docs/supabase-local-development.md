# Supabase local development

The first Supabase database foundation is local-only. It models the two family
businesses, two shared admin accounts, restaurant-scoped menus and orders,
payments, notification jobs, idempotency records, and audit events.

## Start the local stack

Docker Desktop must be running.

```bash
npm install
npm run supabase:start
npm run supabase:status
```

Copy `config/supabase.env.example` to `.env.local`, then replace its placeholder
values with the local URL and keys printed by `npm run supabase:status`. Never
commit `.env.local` or a Supabase secret/service-role key.

Apply the schema and seed data again at any time with:

```bash
npm run supabase:reset
```

This is destructive to the **local** database. Do not run a reset against a
linked hosted project.

## Local admin accounts

The local seed creates two administrators. Both can access both seeded
businesses and restaurants.

| Email | Local password |
| --- | --- |
| `admin.one@foodapp.local` | `local-admin-one` |
| `admin.two@foodapp.local` | `local-admin-two` |

These credentials are development fixtures only and must not be reused in a
hosted environment.

## Security model

- Row Level Security is enabled on every application table.
- Public visitors can read only active restaurants and available menu data.
- Authenticated administrators can read data only for businesses assigned in
  `business_admins`.
- Browser sessions receive no direct write grants. Mutations remain server-side.
- Guest order creation uses the service-only `create_order_from_menu` RPC. It
  derives prices from the menu, enforces Germany/EUR rules, stores a hashed
  tracking token, and makes retries safe with an idempotency key.
- Payment webhook events have a uniqueness constraint to prevent replay.
- Notification delivery uses an outbox so the order transaction does not depend
  on an email provider being available.

The server-only Supabase client reads `SUPABASE_SECRET_KEY`. Never expose that
variable through a `NEXT_PUBLIC_` name.

## Application integration status

Typed browser, authenticated-server, and privileged-server clients live in
`src/lib/supabase`. When Supabase variables are configured, admin login uses
Supabase Auth and access memberships; guest/admin orders, payments, webhook
events, tracking, opening hours, and availability overrides use Supabase.
Without configuration, the existing prototype repositories remain available as
a development fallback.

Pending unpaid orders can be edited transactionally through
`update_order_from_menu`. Authorized or captured orders cannot have their menu
or total changed. Payment and email workers can consume payment-event and
notification-outbox records.

## Hosted project later

When a hosted project is ready:

1. Create the project in the EU region.
2. Link it with `npx supabase link --project-ref <project-ref>`.
3. Review migrations with `npx supabase db push --dry-run`.
4. Push migrations only after reviewing the generated SQL.
5. Set hosted publishable and secret keys in the deployment environment, never
   in Git.

Run `npm run supabase:lint` while the local stack is running to inspect database
functions and schema issues.
