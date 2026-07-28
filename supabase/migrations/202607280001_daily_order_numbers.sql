create table private.daily_order_counters (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  business_date date not null,
  last_number integer not null check (last_number >= 0),
  primary key (restaurant_id, business_date)
);

alter table public.orders
  add column business_date date,
  add column daily_order_number integer;

alter table public.orders
  drop constraint orders_order_number_key;

alter table public.orders
  alter column order_number drop default;

drop sequence public.order_number_seq;

alter table public.orders
  add constraint orders_daily_order_number_nonnegative
    check (daily_order_number is null or daily_order_number >= 0),
  add constraint orders_daily_number_pair
    check (
      (business_date is null and daily_order_number is null)
      or (business_date is not null and daily_order_number is not null)
    );

create unique index orders_restaurant_daily_number_key
  on public.orders (restaurant_id, business_date, daily_order_number)
  where business_date is not null and daily_order_number is not null;

create function private.assign_daily_order_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  restaurant_timezone text;
begin
  select timezone
  into restaurant_timezone
  from public.restaurants
  where id = new.restaurant_id;

  if restaurant_timezone is null then
    raise exception 'restaurant timezone is unavailable';
  end if;

  new.business_date :=
    coalesce(new.created_at, now()) at time zone restaurant_timezone;

  insert into private.daily_order_counters (
    restaurant_id,
    business_date,
    last_number
  )
  values (new.restaurant_id, new.business_date, 0)
  on conflict (restaurant_id, business_date)
  do update
    set last_number = private.daily_order_counters.last_number + 1
  returning last_number into new.daily_order_number;

  new.order_number := '#' || new.daily_order_number::text;
  return new;
end;
$$;

create trigger orders_assign_daily_order_number
before insert on public.orders
for each row execute function private.assign_daily_order_number();

revoke all on table private.daily_order_counters from public;
revoke all on function private.assign_daily_order_number() from public;
