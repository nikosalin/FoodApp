alter table public.restaurants
  add column latitude double precision,
  add column longitude double precision,
  add constraint restaurants_latitude_check
    check (latitude is null or latitude between -90 and 90),
  add constraint restaurants_longitude_check
    check (longitude is null or longitude between -180 and 180),
  add constraint restaurants_coordinates_together_check
    check ((latitude is null) = (longitude is null));

create table public.restaurant_delivery_zones (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  max_distance_meters integer not null
    check (max_distance_meters between 100 and 100000),
  minimum_order_minor integer not null
    check (minimum_order_minor between 0 and 1000000),
  delivery_fee_minor integer not null default 0
    check (delivery_fee_minor between 0 and 100000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, max_distance_meters)
);

create index restaurant_delivery_zones_lookup_idx
  on public.restaurant_delivery_zones(restaurant_id, active, max_distance_meters);

alter table public.orders
  add column delivery_distance_meters integer,
  add column delivery_fee_minor integer not null default 0
    check (delivery_fee_minor between 0 and 100000),
  add column delivery_zone_id uuid
    references public.restaurant_delivery_zones(id) on delete set null,
  add column estimated_fulfillment_at timestamptz,
  add constraint orders_delivery_distance_check
    check (
      delivery_distance_meters is null
      or (order_type = 'delivery' and delivery_distance_meters >= 0)
    ),
  add constraint orders_non_delivery_fee_check
    check (order_type = 'delivery' or delivery_fee_minor = 0);

create trigger restaurant_delivery_zones_set_updated_at
before update on public.restaurant_delivery_zones
for each row execute function private.set_updated_at();

alter table public.restaurant_delivery_zones enable row level security;

create policy delivery_zones_public_select
on public.restaurant_delivery_zones
for select to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.restaurants restaurant
    where restaurant.id = restaurant_delivery_zones.restaurant_id
      and restaurant.status in ('active', 'trial')
  )
);

create policy delivery_zones_admin_all
on public.restaurant_delivery_zones
for all to authenticated
using (
  exists (
    select 1
    from public.restaurants restaurant
    where restaurant.id = restaurant_delivery_zones.restaurant_id
      and (select private.is_business_admin(restaurant.business_id))
  )
)
with check (
  exists (
    select 1
    from public.restaurants restaurant
    where restaurant.id = restaurant_delivery_zones.restaurant_id
      and (select private.is_business_admin(restaurant.business_id))
  )
);

grant select on public.restaurant_delivery_zones to anon, authenticated;
grant insert, update, delete on public.restaurant_delivery_zones to authenticated;

create function private.seed_default_delivery_zones()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.restaurant_delivery_zones (
    restaurant_id,
    max_distance_meters,
    minimum_order_minor,
    delivery_fee_minor
  ) values
    (new.id, 3000, 1500, 200),
    (new.id, 6000, 2500, 350),
    (new.id, 10000, 4000, 500);
  return new;
end;
$$;

create trigger restaurants_seed_default_delivery_zones
after insert on public.restaurants
for each row execute function private.seed_default_delivery_zones();

insert into public.restaurant_delivery_zones (
  restaurant_id,
  max_distance_meters,
  minimum_order_minor,
  delivery_fee_minor
)
select restaurant.id, zone.max_distance, zone.minimum_order, zone.delivery_fee
from public.restaurants restaurant
cross join (
  values
    (3000, 1500, 200),
    (6000, 2500, 350),
    (10000, 4000, 500)
) as zone(max_distance, minimum_order, delivery_fee);

create or replace function public.apply_delivery_quote(
  p_order_id uuid,
  p_restaurant_id uuid,
  p_delivery_zone_id uuid,
  p_distance_meters integer,
  p_delivery_fee_minor integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  item_subtotal integer;
begin
  perform 1
  from public.orders
  where id = p_order_id
    and restaurant_id = p_restaurant_id
    and order_type = 'delivery'
    and deleted_at is null
  for update;

  if not found then
    raise exception 'delivery order not found';
  end if;

  select coalesce(sum(item.line_total_minor), 0)::integer
  into item_subtotal
  from public.order_items item
  where item.order_id = p_order_id;

  if not exists (
    select 1
    from public.restaurant_delivery_zones zone
    where zone.id = p_delivery_zone_id
      and zone.restaurant_id = p_restaurant_id
      and zone.active
      and p_distance_meters <= zone.max_distance_meters
      and p_delivery_fee_minor = zone.delivery_fee_minor
      and item_subtotal >= zone.minimum_order_minor
  ) then
    raise exception 'invalid delivery quote';
  end if;

  update public.orders
  set
    delivery_zone_id = p_delivery_zone_id,
    delivery_distance_meters = p_distance_meters,
    delivery_fee_minor = p_delivery_fee_minor,
    total_minor = item_subtotal + p_delivery_fee_minor
  where id = p_order_id;

  update public.payments
  set amount_minor = item_subtotal + p_delivery_fee_minor
  where order_id = p_order_id;

  return p_order_id;
end;
$$;

revoke all on function public.apply_delivery_quote(uuid, uuid, uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.apply_delivery_quote(uuid, uuid, uuid, integer, integer)
  to service_role;

create or replace function public.replace_delivery_zones(
  p_restaurant_id uuid,
  p_zones jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(p_zones) <> 'array'
    or jsonb_array_length(p_zones) not between 1 and 10 then
    raise exception 'invalid delivery zones';
  end if;

  delete from public.restaurant_delivery_zones
  where restaurant_id = p_restaurant_id;

  insert into public.restaurant_delivery_zones (
    restaurant_id,
    max_distance_meters,
    minimum_order_minor,
    delivery_fee_minor,
    active
  )
  select
    p_restaurant_id,
    zone.max_distance_meters,
    zone.minimum_order_minor,
    zone.delivery_fee_minor,
    zone.active
  from jsonb_to_recordset(p_zones) as zone(
    max_distance_meters integer,
    minimum_order_minor integer,
    delivery_fee_minor integer,
    active boolean
  );
end;
$$;

revoke all on function public.replace_delivery_zones(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_delivery_zones(uuid, jsonb)
  to service_role;
