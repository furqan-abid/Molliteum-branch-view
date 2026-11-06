-- Shows how the policies execute for Sam. Paste into the Supabase SQL Editor after seeding.
-- Each query runs twice: as the planner chooses, then with sequential scans off, because on tables
-- this small the planner's choice can change once statistics exist. Look for InitPlan with loops=1.
create function pg_temp.plan(label text, statement text, seqscan boolean)
returns setof text
language plpgsql
as $$
declare
  sam uuid := (select id from auth.users where email = 'sam@example.com');
begin
  return next format('--- %s (sequential scans %s)', label, case when seqscan then 'on' else 'off' end);
  perform set_config('request.jwt.claims', json_build_object('sub', sam, 'role', 'authenticated')::text, true);
  perform set_config('enable_seqscan', seqscan::text, true);
  perform set_config('role', 'authenticated', true);
  return query execute 'explain (analyze, costs off, timing off, summary off) ' || statement;
  perform set_config('role', 'none', true);
end;
$$;

select * from pg_temp.plan('organizations', 'select id from public.organizations', true)
union all select * from pg_temp.plan('organizations', 'select id from public.organizations', false)
union all select * from pg_temp.plan('people', 'select id from public.people', true)
union all select * from pg_temp.plan('people', 'select id from public.people', false)
union all select * from pg_temp.plan('notes', 'select id from public.notes', true)
union all select * from pg_temp.plan('notes', 'select id from public.notes', false);
