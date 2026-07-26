create or replace function public.claim_notification_jobs(
  p_limit integer default 20
)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select job.id
    from public.notification_outbox job
    where (
        (job.status in ('queued', 'failed') and job.next_attempt_at <= now())
        or (
          job.status = 'sending'
          and job.updated_at < now() - interval '5 minutes'
        )
      )
      and job.attempt_count < 8
    order by job.created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 50)
  )
  update public.notification_outbox job
  set
    status = 'sending',
    attempt_count = job.attempt_count + 1,
    updated_at = now()
  from candidates
  where job.id = candidates.id
  returning job.*;
end;
$$;

revoke all on function public.claim_notification_jobs(integer)
  from public, anon, authenticated;
grant execute on function public.claim_notification_jobs(integer)
  to service_role;
