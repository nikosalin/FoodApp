create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.business_role as enum ('owner', 'admin');
create type public.restaurant_status as enum ('active', 'trial', 'blocked');
create type public.order_status as enum (
  'pending',
  'accepted',
  'preparing',
  'ready',
  'completed',
  'cancelled',
  'rejected'
);
create type public.order_type as enum ('table', 'takeaway', 'delivery');
create type public.order_source as enum (
  'guest',
  'admin',
  'phone',
  'walk_in',
  'daily_summary'
);
create type public.payment_provider as enum ('stripe', 'paypal', 'offline');
create type public.payment_method as enum (
  'card',
  'apple_pay',
  'google_pay',
  'paypal',
  'cash_on_site',
  'cash_on_delivery',
  'external_card',
  'other'
);
create type public.payment_status as enum (
  'pending',
  'authorized',
  'captured',
  'cancelled',
  'refunded',
  'failed'
);
create type public.notification_status as enum (
  'queued',
  'sending',
  'sent',
  'delivered',
  'bounced',
  'failed'
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  legal_name text,
  country_code text not null default 'DE' check (country_code = 'DE'),
  currency text not null default 'EUR' check (currency = 'EUR'),
  stripe_account_id text unique,
  paypal_merchant_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_admins (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.business_role not null default 'admin',
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_admins_user_id_idx on public.business_admins(user_id);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status public.restaurant_status not null default 'active',
  phone text,
  email text,
  address_line text not null,
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  city text not null,
  country_code text not null default 'DE' check (country_code = 'DE'),
  timezone text not null default 'Europe/Berlin'
    check (timezone = 'Europe/Berlin'),
  accepts_table boolean not null default true,
  accepts_takeaway boolean not null default true,
  accepts_delivery boolean not null default false,
  accepts_cash_on_delivery boolean not null default false,
  ordering_override_mode text
    check (ordering_override_mode in ('open', 'closed')),
  ordering_override_until timestamptz,
  ordering_override_reason text
    check (
      ordering_override_reason is null
      or char_length(ordering_override_reason) <= 160
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index restaurants_business_id_idx on public.restaurants(business_id);

create table public.restaurant_opening_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, day_of_week)
);
create index restaurant_opening_hours_restaurant_idx
  on public.restaurant_opening_hours(restaurant_id, day_of_week);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name)
);
create index menu_categories_restaurant_id_idx
  on public.menu_categories(restaurant_id, sort_order);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  code text not null check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  price_minor integer not null check (price_minor between 0 and 1000000),
  active boolean not null default true,
  sold_out boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, code)
);
create index menu_items_restaurant_category_idx
  on public.menu_items(restaurant_id, category_id, sort_order);

create sequence public.order_number_seq start with 1000;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  order_number text not null unique
    default ('ORD-' || nextval('public.order_number_seq')::text),
  source public.order_source not null default 'guest',
  order_type public.order_type not null,
  table_number text check (
    table_number is null or char_length(table_number) between 1 and 12
  ),
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  customer_email text,
  customer_phone text,
  delivery_address jsonb,
  customer_notes text check (
    customer_notes is null or char_length(customer_notes) <= 1000
  ),
  status public.order_status not null default 'pending',
  payment_method public.payment_method not null,
  total_minor integer not null check (total_minor >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  tracking_token_hash text not null unique,
  contact_verified boolean not null default false,
  accepted_at timestamptz,
  closed_at timestamptz,
  rejection_reason text,
  created_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_email is not null or customer_phone is not null),
  check (
    (order_type = 'table' and table_number is not null)
    or order_type <> 'table'
  ),
  check (
    (payment_method <> 'cash_on_site' or order_type in ('table', 'takeaway'))
    and
    (payment_method <> 'cash_on_delivery' or order_type = 'delivery')
  ),
  check (
    order_type <> 'delivery'
    or (
      delivery_address is not null
      and delivery_address->>'countryCode' = 'DE'
      and delivery_address->>'postalCode' ~ '^[0-9]{5}$'
      and payment_method <> 'cash_on_site'
    )
  ),
  check (
    payment_method <> 'cash_on_delivery'
    or customer_phone is not null
  )
);
create index orders_restaurant_created_idx
  on public.orders(restaurant_id, created_at desc);
create index orders_restaurant_status_idx
  on public.orders(restaurant_id, status, created_at desc);
create index orders_business_created_idx
  on public.orders(business_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  menu_item_code text not null,
  name_snapshot text not null,
  unit_price_minor integer not null check (unit_price_minor >= 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total_minor integer generated always as
    (unit_price_minor * quantity) stored,
  created_at timestamptz not null default now()
);
create index order_items_order_id_idx on public.order_items(order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  provider public.payment_provider not null,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  provider_payment_id text,
  provider_authorization_id text,
  idempotency_key text not null,
  authorized_at timestamptz,
  captured_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, idempotency_key),
  unique (provider, provider_payment_id)
);
create index payments_order_id_idx on public.payments(order_id);
create index payments_business_created_idx
  on public.payments(business_id, created_at desc);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete restrict,
  provider public.payment_provider not null,
  provider_event_id text not null,
  event_type text not null,
  status public.payment_status,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  failure_code text,
  unique (provider, provider_event_id)
);

create table public.idempotency_keys (
  scope text not null,
  idempotency_key text not null,
  request_hash text not null,
  resource_id uuid,
  response_body jsonb,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, idempotency_key)
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete restrict,
  event_type text not null,
  channel text not null default 'email' check (channel = 'email'),
  recipient text not null,
  template_data jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'queued',
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, event_type, channel)
);
create index notification_outbox_pending_idx
  on public.notification_outbox(status, next_attempt_at)
  where status in ('queued', 'failed');

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete restrict,
  restaurant_id uuid references public.restaurants(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text,
  safe_changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_business_created_idx
  on public.audit_events(business_id, created_at desc);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_set_updated_at before update on public.businesses
for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger restaurants_set_updated_at before update on public.restaurants
for each row execute function private.set_updated_at();
create trigger restaurant_opening_hours_set_updated_at
before update on public.restaurant_opening_hours
for each row execute function private.set_updated_at();
create trigger menu_categories_set_updated_at before update on public.menu_categories
for each row execute function private.set_updated_at();
create trigger menu_items_set_updated_at before update on public.menu_items
for each row execute function private.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function private.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
for each row execute function private.set_updated_at();
create trigger idempotency_keys_set_updated_at before update on public.idempotency_keys
for each row execute function private.set_updated_at();
create trigger notification_outbox_set_updated_at
before update on public.notification_outbox
for each row execute function private.set_updated_at();

create function private.enforce_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  transition_allowed boolean;
begin
  if new.business_id <> old.business_id
    or new.restaurant_id <> old.restaurant_id
    or new.currency <> old.currency
  then
    raise exception 'order ownership and financial snapshots are immutable';
  end if;
  if new.total_minor <> old.total_minor and (
    old.status <> 'pending'
    or exists (
      select 1 from public.payments payment
      where payment.order_id = old.id
        and payment.status in ('authorized', 'captured', 'refunded')
    )
  ) then
    raise exception 'order total cannot change after payment authorization';
  end if;

  if new.status <> old.status then
    transition_allowed := case old.status
      when 'pending' then new.status in ('accepted', 'rejected')
      when 'accepted' then new.status in ('preparing', 'cancelled')
      when 'preparing' then new.status in ('ready', 'cancelled')
      when 'ready' then new.status in ('completed', 'cancelled')
      else false
    end;
    if not transition_allowed then
      raise exception 'invalid order status transition from % to %',
        old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_enforce_update before update on public.orders
for each row execute function private.enforce_order_update();

create function private.is_business_admin(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_admins
    where business_id = target_business_id
      and user_id = (select auth.uid())
  );
$$;

create function private.can_access_restaurant(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.restaurants restaurant
    join public.business_admins membership
      on membership.business_id = restaurant.business_id
    where restaurant.id = target_restaurant_id
      and membership.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_business_admin(uuid) from public;
revoke all on function private.can_access_restaurant(uuid) from public;
grant execute on function private.is_business_admin(uuid) to authenticated;
grant execute on function private.can_access_restaurant(uuid) to authenticated;

create function private.restaurant_accepting_orders(
  target_restaurant_id uuid,
  checked_at timestamptz default now()
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  restaurant_record public.restaurants%rowtype;
  hours_record public.restaurant_opening_hours%rowtype;
  local_timestamp timestamp;
  local_time time;
begin
  select * into restaurant_record
  from public.restaurants
  where id = target_restaurant_id;
  if not found or restaurant_record.status not in ('active', 'trial') then
    return false;
  end if;

  if restaurant_record.ordering_override_mode is not null
    and (
      restaurant_record.ordering_override_until is null
      or restaurant_record.ordering_override_until > checked_at
    )
  then
    return restaurant_record.ordering_override_mode = 'open';
  end if;

  local_timestamp := checked_at at time zone restaurant_record.timezone;
  local_time := local_timestamp::time;
  select * into hours_record
  from public.restaurant_opening_hours
  where restaurant_id = target_restaurant_id
    and day_of_week = extract(dow from local_timestamp)::smallint;
  if not found or hours_record.closed then
    return false;
  end if;
  if hours_record.closes_at > hours_record.opens_at then
    return local_time >= hours_record.opens_at
      and local_time < hours_record.closes_at;
  end if;
  return local_time >= hours_record.opens_at
    or local_time < hours_record.closes_at;
end;
$$;
revoke all on function private.restaurant_accepting_orders(uuid, timestamptz)
from public, anon, authenticated;
grant execute on function private.restaurant_accepting_orders(uuid, timestamptz)
to service_role;

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.business_admins enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_opening_hours enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.audit_events enable row level security;

create policy businesses_admin_select on public.businesses
for select to authenticated
using ((select private.is_business_admin(id)));

create policy profiles_self_select on public.profiles
for select to authenticated using ((select auth.uid()) = id);
create policy profiles_self_update on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy memberships_admin_select on public.business_admins
for select to authenticated
using ((select private.is_business_admin(business_id)));

create policy restaurants_admin_all on public.restaurants
for all to authenticated
using ((select private.is_business_admin(business_id)))
with check ((select private.is_business_admin(business_id)));
create policy restaurants_public_select on public.restaurants
for select to anon
using (status in ('active', 'trial'));

create policy opening_hours_admin_all on public.restaurant_opening_hours
for all to authenticated
using ((select private.can_access_restaurant(restaurant_id)))
with check ((select private.can_access_restaurant(restaurant_id)));
create policy opening_hours_public_select on public.restaurant_opening_hours
for select to anon
using (
  exists (
    select 1 from public.restaurants restaurant
    where restaurant.id = restaurant_opening_hours.restaurant_id
      and restaurant.status in ('active', 'trial')
  )
);

create policy categories_admin_all on public.menu_categories
for all to authenticated
using ((select private.can_access_restaurant(restaurant_id)))
with check ((select private.can_access_restaurant(restaurant_id)));
create policy categories_public_select on public.menu_categories
for select to anon
using (
  active
  and exists (
    select 1 from public.restaurants restaurant
    where restaurant.id = menu_categories.restaurant_id
      and restaurant.status in ('active', 'trial')
  )
);

create policy menu_items_admin_all on public.menu_items
for all to authenticated
using ((select private.can_access_restaurant(restaurant_id)))
with check ((select private.can_access_restaurant(restaurant_id)));
create policy menu_items_public_select on public.menu_items
for select to anon
using (
  active
  and not sold_out
  and exists (
    select 1 from public.restaurants restaurant
    where restaurant.id = menu_items.restaurant_id
      and restaurant.status in ('active', 'trial')
  )
);

create policy orders_admin_select on public.orders
for select to authenticated
using ((select private.is_business_admin(business_id)));
create policy orders_admin_insert on public.orders
for insert to authenticated
with check ((select private.is_business_admin(business_id)));
create policy orders_admin_update on public.orders
for update to authenticated
using ((select private.is_business_admin(business_id)))
with check ((select private.is_business_admin(business_id)));

create policy order_items_admin_select on public.order_items
for select to authenticated
using (
  exists (
    select 1 from public.orders target_order
    where target_order.id = order_items.order_id
      and (select private.is_business_admin(target_order.business_id))
  )
);
create policy order_items_admin_insert on public.order_items
for insert to authenticated
with check (
  exists (
    select 1 from public.orders target_order
    where target_order.id = order_items.order_id
      and (select private.is_business_admin(target_order.business_id))
  )
);

create policy payments_admin_select on public.payments
for select to authenticated
using ((select private.is_business_admin(business_id)));

create policy payment_events_admin_select on public.payment_events
for select to authenticated
using (
  exists (
    select 1 from public.payments target_payment
    where target_payment.id = payment_events.payment_id
      and (select private.is_business_admin(target_payment.business_id))
  )
);

create policy outbox_admin_select on public.notification_outbox
for select to authenticated
using (
  exists (
    select 1 from public.orders target_order
    where target_order.id = notification_outbox.order_id
      and (select private.is_business_admin(target_order.business_id))
  )
);

create policy audit_admin_select on public.audit_events
for select to authenticated
using (
  business_id is not null
  and (select private.is_business_admin(business_id))
);

grant usage on schema public to anon, authenticated;
grant select on public.restaurants, public.menu_categories, public.menu_items
  to anon;
grant select on all tables in schema public to authenticated;

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.payments;

create function public.create_order_from_menu(
  p_restaurant_id uuid,
  p_order_type public.order_type,
  p_table_number text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address jsonb,
  p_customer_notes text,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_idempotency_key text,
  p_request_hash text,
  p_source public.order_source default 'guest',
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_restaurant public.restaurants%rowtype;
  existing_key public.idempotency_keys%rowtype;
  created_order public.orders%rowtype;
  tracking_token text;
  calculated_total bigint;
  requested_count integer;
  matched_count integer;
  selected_provider public.payment_provider;
  safe_email text;
  safe_response jsonb;
begin
  if char_length(p_idempotency_key) not between 16 and 100 then
    raise exception 'invalid idempotency key';
  end if;
  if p_request_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid request hash';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_restaurant_id::text || '/' || p_idempotency_key, 0)
  );

  select * into existing_key
  from public.idempotency_keys
  where scope = p_restaurant_id::text
    and idempotency_key = p_idempotency_key;

  if found then
    if existing_key.request_hash <> p_request_hash then
      raise exception 'idempotency key reused with different payload';
    end if;
    if existing_key.status = 'completed' then
      return existing_key.response_body;
    end if;
  else
    insert into public.idempotency_keys (
      scope, idempotency_key, request_hash, expires_at
    ) values (
      p_restaurant_id::text,
      p_idempotency_key,
      p_request_hash,
      now() + interval '24 hours'
    );
  end if;

  select * into selected_restaurant
  from public.restaurants
  where id = p_restaurant_id
    and status in ('active', 'trial')
  for share;
  if not found then
    raise exception 'restaurant is not accepting orders';
  end if;
  if not private.restaurant_accepting_orders(p_restaurant_id, now()) then
    raise exception 'ordering is currently closed';
  end if;

  if p_order_type = 'table' and not selected_restaurant.accepts_table then
    raise exception 'table orders are disabled';
  elsif p_order_type = 'takeaway' and not selected_restaurant.accepts_takeaway then
    raise exception 'takeaway orders are disabled';
  elsif p_order_type = 'delivery' and not selected_restaurant.accepts_delivery then
    raise exception 'delivery orders are disabled';
  end if;
  if p_order_type = 'delivery' and p_payment_method = 'cash_on_site' then
    raise exception 'cash on site is unavailable for delivery';
  end if;
  if p_payment_method = 'cash_on_delivery'
    and (
      p_order_type <> 'delivery'
      or not selected_restaurant.accepts_cash_on_delivery
    )
  then
    raise exception 'cash on delivery is unavailable';
  end if;
  if p_customer_email is null and p_customer_phone is null then
    raise exception 'email or phone is required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'at least one menu item is required';
  end if;

  with requested as (
    select item.code, item.quantity
    from jsonb_to_recordset(p_items) as item(code text, quantity integer)
  ),
  priced as (
    select requested.code, requested.quantity, menu_item.price_minor
    from requested
    join public.menu_items menu_item
      on menu_item.restaurant_id = p_restaurant_id
      and menu_item.code = requested.code
      and menu_item.active
      and not menu_item.sold_out
    where requested.quantity between 1 and 99
  )
  select
    coalesce(sum(price_minor::bigint * quantity), 0),
    (select count(*) from requested),
    count(*)
  into calculated_total, requested_count, matched_count
  from priced;

  if requested_count <> matched_count or calculated_total > 1000000 then
    raise exception 'one or more menu items are invalid';
  end if;

  tracking_token := encode(extensions.gen_random_bytes(32), 'hex');
  safe_email := nullif(lower(trim(p_customer_email)), '');

  insert into public.orders (
    restaurant_id,
    business_id,
    source,
    order_type,
    table_number,
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    customer_notes,
    payment_method,
    total_minor,
    tracking_token_hash,
    created_by
  ) values (
    p_restaurant_id,
    selected_restaurant.business_id,
    p_source,
    p_order_type,
    nullif(trim(p_table_number), ''),
    trim(p_customer_name),
    safe_email,
    nullif(trim(p_customer_phone), ''),
    p_delivery_address,
    nullif(trim(p_customer_notes), ''),
    p_payment_method,
    calculated_total::integer,
    encode(extensions.digest(tracking_token, 'sha256'), 'hex'),
    p_created_by
  )
  returning * into created_order;

  insert into public.order_items (
    order_id,
    menu_item_id,
    menu_item_code,
    name_snapshot,
    unit_price_minor,
    quantity
  )
  select
    created_order.id,
    menu_item.id,
    menu_item.code,
    menu_item.name,
    menu_item.price_minor,
    requested.quantity
  from jsonb_to_recordset(p_items) as requested(code text, quantity integer)
  join public.menu_items menu_item
    on menu_item.restaurant_id = p_restaurant_id
    and menu_item.code = requested.code;

  selected_provider := case
    when p_payment_method = 'paypal' then 'paypal'::public.payment_provider
    when p_payment_method in (
      'cash_on_site', 'cash_on_delivery', 'external_card', 'other'
    )
      then 'offline'::public.payment_provider
    else 'stripe'::public.payment_provider
  end;

  insert into public.payments (
    order_id,
    business_id,
    provider,
    method,
    status,
    amount_minor,
    idempotency_key
  ) values (
    created_order.id,
    created_order.business_id,
    selected_provider,
    p_payment_method,
    case
      when p_payment_method = 'external_card'
        then 'captured'::public.payment_status
      else 'pending'::public.payment_status
    end,
    created_order.total_minor,
    'authorize/' || p_idempotency_key
  );

  if safe_email is not null then
    insert into public.notification_outbox (
      order_id, event_type, recipient, template_data
    ) values (
      created_order.id,
      'order_created',
      safe_email,
      jsonb_build_object(
        'orderNumber', created_order.order_number,
        'trackingToken', tracking_token
      )
    );
  end if;

  insert into public.audit_events (
    business_id,
    restaurant_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    safe_changes
  ) values (
    created_order.business_id,
    created_order.restaurant_id,
    p_created_by,
    'order.created',
    'order',
    created_order.id,
    jsonb_build_object(
      'source', p_source,
      'paymentMethod', p_payment_method,
      'totalMinor', created_order.total_minor
    )
  );

  update public.idempotency_keys
  set
    resource_id = created_order.id,
    response_body = jsonb_build_object(
      'id', created_order.id,
      'orderNumber', created_order.order_number,
      'status', created_order.status,
      'totalMinor', created_order.total_minor,
      'trackingToken', tracking_token
    ),
    status = 'completed'
  where scope = p_restaurant_id::text
    and idempotency_key = p_idempotency_key
  returning response_body into safe_response;

  return safe_response;
end;
$$;

create function public.update_order_from_menu(
  p_order_id uuid,
  p_restaurant_id uuid,
  p_order_type public.order_type,
  p_table_number text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address jsonb,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_actor_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  calculated_total bigint;
  requested_count integer;
  matched_count integer;
begin
  select * into target_order
  from public.orders
  where id = p_order_id
    and restaurant_id = p_restaurant_id
    and deleted_at is null
  for update;
  if not found then
    raise exception 'order not found';
  end if;
  if target_order.status <> 'pending' then
    raise exception 'only pending orders can be edited';
  end if;
  if exists (
    select 1 from public.payments
    where order_id = p_order_id
      and status in ('authorized', 'captured', 'refunded')
  ) then
    raise exception 'authorized or captured orders cannot be edited';
  end if;
  if p_order_type = 'table' and nullif(trim(p_table_number), '') is null then
    raise exception 'table number is required';
  end if;
  if p_order_type = 'delivery' and p_delivery_address is null then
    raise exception 'delivery address is required';
  end if;
  if p_payment_method = 'cash_on_delivery' and (
    p_order_type <> 'delivery'
    or nullif(trim(p_customer_phone), '') is null
    or not exists (
      select 1 from public.restaurants
      where id = p_restaurant_id
        and accepts_cash_on_delivery
    )
  ) then
    raise exception 'cash on delivery is unavailable';
  end if;

  with requested as (
    select item.code, item.quantity
    from jsonb_to_recordset(p_items) as item(code text, quantity integer)
  ),
  priced as (
    select requested.code, requested.quantity, menu_item.price_minor
    from requested
    join public.menu_items menu_item
      on menu_item.restaurant_id = p_restaurant_id
      and menu_item.code = requested.code
      and menu_item.active
      and not menu_item.sold_out
    where requested.quantity between 1 and 99
  )
  select
    coalesce(sum(price_minor::bigint * quantity), 0),
    (select count(*) from requested),
    count(*)
  into calculated_total, requested_count, matched_count
  from priced;
  if requested_count < 1
    or requested_count <> matched_count
    or calculated_total > 1000000
  then
    raise exception 'one or more menu items are invalid';
  end if;

  update public.orders
  set
    order_type = p_order_type,
    table_number = nullif(trim(p_table_number), ''),
    customer_name = trim(p_customer_name),
    customer_email = nullif(lower(trim(p_customer_email)), ''),
    customer_phone = nullif(trim(p_customer_phone), ''),
    delivery_address = p_delivery_address,
    payment_method = p_payment_method,
    total_minor = calculated_total::integer
  where id = p_order_id;

  delete from public.order_items where order_id = p_order_id;
  insert into public.order_items (
    order_id,
    menu_item_id,
    menu_item_code,
    name_snapshot,
    unit_price_minor,
    quantity
  )
  select
    p_order_id,
    menu_item.id,
    menu_item.code,
    menu_item.name,
    menu_item.price_minor,
    requested.quantity
  from jsonb_to_recordset(p_items) as requested(code text, quantity integer)
  join public.menu_items menu_item
    on menu_item.restaurant_id = p_restaurant_id
    and menu_item.code = requested.code;

  update public.payments
  set
    provider = case
      when p_payment_method = 'paypal' then 'paypal'::public.payment_provider
      when p_payment_method in (
        'cash_on_site', 'cash_on_delivery', 'external_card', 'other'
      )
        then 'offline'::public.payment_provider
      else 'stripe'::public.payment_provider
    end,
    method = p_payment_method,
    status = case
      when p_payment_method = 'external_card'
        then 'captured'::public.payment_status
      else 'pending'::public.payment_status
    end,
    amount_minor = calculated_total::integer
  where order_id = p_order_id;

  insert into public.audit_events (
    business_id, restaurant_id, actor_user_id, action,
    entity_type, entity_id, safe_changes
  ) values (
    target_order.business_id, p_restaurant_id, p_actor_user_id,
    'order.edited', 'order', p_order_id,
    jsonb_build_object('totalMinor', calculated_total)
  );
  return p_order_id;
end;
$$;

revoke all on function public.update_order_from_menu(
  uuid, uuid, public.order_type, text, text, text, text, jsonb,
  public.payment_method, jsonb, uuid
) from public, anon, authenticated;
grant execute on function public.update_order_from_menu(
  uuid, uuid, public.order_type, text, text, text, text, jsonb,
  public.payment_method, jsonb, uuid
) to service_role;

revoke all on function public.create_order_from_menu(
  uuid,
  public.order_type,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  public.payment_method,
  jsonb,
  text,
  text,
  public.order_source,
  uuid
) from public, anon, authenticated;
grant execute on function public.create_order_from_menu(
  uuid,
  public.order_type,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  public.payment_method,
  jsonb,
  text,
  text,
  public.order_source,
  uuid
) to service_role;
