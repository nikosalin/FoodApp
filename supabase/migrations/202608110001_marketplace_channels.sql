create type public.marketplace_provider as enum (
  'wolt',
  'uber_eats',
  'lieferando'
);

create type public.marketplace_connection_status as enum (
  'disconnected',
  'sandbox',
  'active',
  'degraded',
  'disabled'
);

create type public.marketplace_order_status as enum (
  'received',
  'accepted',
  'preparing',
  'ready',
  'picked_up',
  'delivered',
  'rejected',
  'cancelled',
  'failed'
);

create table public.marketplace_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  provider public.marketplace_provider not null,
  external_store_id text not null check (char_length(external_store_id) between 1 and 255),
  display_name text not null check (char_length(display_name) between 1 and 120),
  status public.marketplace_connection_status not null default 'disconnected',
  settings jsonb not null default '{}'::jsonb,
  last_event_at timestamptz,
  last_sync_at timestamptz,
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_store_id),
  unique (restaurant_id, provider)
);

create table public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.marketplace_connections(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  provider public.marketplace_provider not null,
  external_order_id text not null check (char_length(external_order_id) between 1 and 255),
  display_order_id text,
  status public.marketplace_order_status not null default 'received',
  fulfillment_type text not null check (fulfillment_type in ('delivery', 'pickup', 'dine_in')),
  payment_managed_by_provider boolean not null default true,
  currency text not null default 'EUR' check (currency = 'EUR'),
  subtotal_minor integer not null default 0 check (subtotal_minor >= 0),
  total_minor integer not null default 0 check (total_minor >= 0),
  preparation_minutes integer check (preparation_minutes between 0 and 240),
  customer_notes text check (customer_notes is null or char_length(customer_notes) <= 1000),
  placed_at timestamptz not null,
  accepted_at timestamptz,
  ready_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_order_id)
);

create index marketplace_orders_restaurant_status_idx
  on public.marketplace_orders(restaurant_id, status, placed_at desc);

create table public.marketplace_order_items (
  id uuid primary key default gen_random_uuid(),
  marketplace_order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  external_item_id text,
  name_snapshot text not null check (char_length(name_snapshot) between 1 and 255),
  quantity integer not null check (quantity between 1 and 99),
  unit_price_minor integer not null default 0 check (unit_price_minor >= 0),
  modifiers jsonb not null default '[]'::jsonb,
  special_instructions text check (
    special_instructions is null or char_length(special_instructions) <= 1000
  ),
  created_at timestamptz not null default now()
);

create index marketplace_order_items_order_idx
  on public.marketplace_order_items(marketplace_order_id);

create table public.marketplace_events (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.marketplace_connections(id) on delete set null,
  provider public.marketplace_provider not null,
  provider_event_id text not null check (char_length(provider_event_id) between 1 and 255),
  event_type text not null check (char_length(event_type) between 1 and 120),
  external_store_id text,
  external_order_id text,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'processed', 'ignored', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 100),
  safe_metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create index marketplace_events_pending_idx
  on public.marketplace_events(processing_status, received_at)
  where processing_status in ('pending', 'failed');

alter table public.marketplace_connections enable row level security;
alter table public.marketplace_orders enable row level security;
alter table public.marketplace_order_items enable row level security;
alter table public.marketplace_events enable row level security;

create policy marketplace_connections_admin_select on public.marketplace_connections
for select to authenticated using ((select private.is_business_admin(business_id)));

create policy marketplace_orders_admin_select on public.marketplace_orders
for select to authenticated using ((select private.is_business_admin(business_id)));

create policy marketplace_order_items_admin_select on public.marketplace_order_items
for select to authenticated using (
  exists (
    select 1 from public.marketplace_orders target_order
    where target_order.id = marketplace_order_items.marketplace_order_id
      and (select private.is_business_admin(target_order.business_id))
  )
);

create policy marketplace_events_admin_select on public.marketplace_events
for select to authenticated using (
  exists (
    select 1 from public.marketplace_connections connection
    where connection.id = marketplace_events.connection_id
      and (select private.is_business_admin(connection.business_id))
  )
);

create trigger marketplace_connections_set_updated_at
before update on public.marketplace_connections
for each row execute function private.set_updated_at();

create trigger marketplace_orders_set_updated_at
before update on public.marketplace_orders
for each row execute function private.set_updated_at();
