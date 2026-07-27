create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (char_length(event_type) between 3 and 80),
  from_status public.order_status,
  to_status public.order_status,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index order_events_order_created_idx
  on public.order_events(order_id, created_at desc);
create index order_events_restaurant_created_idx
  on public.order_events(restaurant_id, created_at desc);

insert into public.order_events (
  order_id,
  business_id,
  restaurant_id,
  actor_user_id,
  event_type,
  to_status,
  details,
  created_at
)
select
  existing_order.id,
  existing_order.business_id,
  existing_order.restaurant_id,
  existing_order.created_by,
  'order.created',
  existing_order.status,
  jsonb_build_object(
    'source', existing_order.source,
    'orderNumber', existing_order.order_number,
    'totalMinor', existing_order.total_minor,
    'paymentMethod', existing_order.payment_method,
    'backfilled', true
  ),
  existing_order.created_at
from public.orders existing_order;

create function private.prevent_order_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'order history is append-only';
end;
$$;

create trigger order_events_append_only
before update or delete on public.order_events
for each row execute function private.prevent_order_event_mutation();

create function private.record_order_created_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.order_events (
    order_id,
    business_id,
    restaurant_id,
    actor_user_id,
    event_type,
    to_status,
    details
  ) values (
    new.id,
    new.business_id,
    new.restaurant_id,
    new.created_by,
    'order.created',
    new.status,
    jsonb_build_object(
      'source', new.source,
      'orderNumber', new.order_number,
      'totalMinor', new.total_minor,
      'paymentMethod', new.payment_method
    )
  );
  return new;
end;
$$;

create trigger orders_record_created_event
after insert on public.orders
for each row execute function private.record_order_created_event();

create or replace function public.transition_order_status(
  p_order_id uuid,
  p_restaurant_id uuid,
  p_status public.order_status,
  p_rejection_reason text,
  p_actor_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  target_order public.orders%rowtype;
  changed_at timestamptz := now();
begin
  select *
  into target_order
  from public.orders
  where id = p_order_id
    and restaurant_id = p_restaurant_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'order not found';
  end if;

  update public.orders
  set
    status = p_status,
    rejection_reason = case
      when p_status = 'rejected' then nullif(trim(p_rejection_reason), '')
      else rejection_reason
    end,
    accepted_at = case
      when p_status = 'accepted' then changed_at
      else accepted_at
    end,
    closed_at = case
      when p_status in ('completed', 'cancelled', 'rejected') then changed_at
      else closed_at
    end
  where id = p_order_id;

  insert into public.order_events (
    order_id,
    business_id,
    restaurant_id,
    actor_user_id,
    event_type,
    from_status,
    to_status,
    details
  ) values (
    target_order.id,
    target_order.business_id,
    target_order.restaurant_id,
    p_actor_user_id,
    'order.status_changed',
    target_order.status,
    p_status,
    case
      when p_status = 'rejected'
        then jsonb_build_object('reason', nullif(trim(p_rejection_reason), ''))
      else '{}'::jsonb
    end
  );

  return target_order.id;
end;
$$;

revoke all on function public.transition_order_status(
  uuid, uuid, public.order_status, text, uuid
) from public, anon, authenticated;
grant execute on function public.transition_order_status(
  uuid, uuid, public.order_status, text, uuid
) to service_role;

alter table public.order_events enable row level security;

create policy order_events_admin_select on public.order_events
for select to authenticated
using ((select private.is_business_admin(business_id)));

grant select on public.order_events to authenticated;
