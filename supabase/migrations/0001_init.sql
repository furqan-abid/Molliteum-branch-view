-- Branch View: a person sees only the people below them in their own branch.
-- Every rule lives in this file. The app and its UI enforce nothing.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

-- ltree stores a position in the tree as one value, so "is below" needs no recursive query.
-- It lives in the extensions schema to keep its functions out of the public API.
create extension if not exists ltree with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- A person's place in the tree comes from their org's path, so the path must be trustworthy.
-- The empty default only lets typed clients omit path; the trigger below always overwrites it.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.organizations (id),
  path extensions.ltree not null unique default '',
  constraint not_own_parent check (parent_id <> id)
);

-- One org per person, held here rather than in the JWT, so a move takes effect on the next query.
create table public.people (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  org_id uuid not null references public.organizations (id)
);

-- A second kind of data, to show the same rule reused rather than rewritten.
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  body text not null
);

-- A control: RLS with no policies must return nothing, even to a signed-in user.
create table public.vault_test (
  id uuid primary key default gen_random_uuid(),
  secret text
);

-- security_invoker makes the view obey the caller's RLS. Without it the view would run
-- as its owner, who bypasses RLS, and leak every person to anyone allowed to read the view.
create view public.team_directory
with (security_invoker = true) as
select p.full_name, o.name as org_name, o.path
from public.people p
join public.organizations o on o.id = p.org_id;

comment on table public.organizations is 'The org tree. path is set by a trigger, never by a client.';
comment on table public.people is 'One row per login, placing that person in one organization.';
comment on table public.notes is 'Sample data per org, showing org_ids_below_me reused on a second table.';
comment on table public.vault_test is 'RLS on with zero policies. Proves that no policy means no rows.';
comment on view public.team_directory is 'People with their org. Obeys the caller''s RLS through security_invoker.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- GiST is the index type that serves ltree's ancestor and descendant operators.
create index organizations_path_idx on public.organizations using gist (path);

-- The directory view and the "try another branch" query both look people up by org.
create index people_org_id_idx on public.people (org_id);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- Not exposed to the API, so these functions can back policies without being callable as RPCs.
-- authenticated still needs usage, because policies call the functions as that role.
create schema private;
grant usage on schema private to authenticated;

-- Deriving path from the parent means a client can never claim a place in the tree.
-- search_path is empty to block hijacking, which is why extension objects are fully qualified.
create function private.set_org_path()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  slug extensions.ltree := extensions.text2ltree(
    lower(regexp_replace(new.name, '[^a-zA-Z0-9]+', '_', 'g'))
  );
begin
  if new.parent_id is null then
    new.path := slug;
  else
    select parent.path operator(extensions.||) slug
    into new.path
    from public.organizations parent
    where parent.id = new.parent_id;
  end if;
  return new;
end;
$$;

revoke execute on function private.set_org_path() from public;

create trigger set_path
before insert on public.organizations
for each row execute function private.set_org_path();

-- Security definer so the lookup does not recurse into the policies that call it.
-- Reads the org live and never from the JWT, so a move applies without a new login.
create function private.my_org_path()
returns extensions.ltree
language sql
stable
security definer
set search_path = ''
as $$
  select o.path
  from public.people p
  join public.organizations o on o.id = p.org_id
  where p.id = auth.uid();
$$;

-- The single definition of "below me", reused by people and notes so the rule cannot drift.
-- It takes no row values, so it runs once per query. No people row means a null path and no orgs.
create function private.org_ids_below_me()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select o.id
  from public.organizations o
  where o.path operator(extensions.<@) (select private.my_org_path())
    and o.path operator(extensions.<>) (select private.my_org_path()) -- STRICT: my own org is not below me. Delete this line to make it inclusive.
$$;

revoke execute on function private.my_org_path() from public, anon;
revoke execute on function private.org_ids_below_me() from public, anon;
grant execute on function private.my_org_path() to authenticated;
grant execute on function private.org_ids_below_me() to authenticated;

-- Lets the test suite read each table's RLS flags, which the API cannot otherwise reach.
-- It is the one function in the public schema, and only the service role may call it.
create function public.rls_status()
returns table (table_name text, rls_enabled boolean, rls_forced boolean)
language sql
stable
set search_path = ''
as $$
  select c.relname::text, c.relrowsecurity, c.relforcerowsecurity
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p');
$$;

revoke execute on function public.rls_status() from public, anon, authenticated;
grant execute on function public.rls_status() to service_role;

comment on function private.set_org_path() is 'Trigger: sets path from the parent''s path plus a slug of the name.';
comment on function private.my_org_path() is 'The caller''s org path, looked up live from people. Never read from the JWT.';
comment on function private.org_ids_below_me() is 'The ids of orgs strictly below the caller''s org.';
comment on function public.rls_status() is 'RLS flags for each public table. Service role only, for the meta-test.';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

-- Grants differ between Supabase projects, so state them instead of inheriting them.
-- Writes stay granted to authenticated so that RLS, not a missing privilege, is what refuses them.
revoke all on public.organizations, public.people, public.notes, public.vault_test, public.team_directory
  from anon, authenticated;
grant select on public.organizations, public.people, public.notes, public.vault_test, public.team_directory
  to anon, authenticated;
grant insert, update, delete on public.organizations, public.people, public.notes, public.vault_test
  to authenticated;
grant all on public.organizations, public.people, public.notes, public.vault_test, public.team_directory
  to service_role;

-- Nobody may move themselves in the tree. A column revoke alone does nothing while a table-level
-- update grant exists, so the table grant is removed and only full_name is given back.
revoke update on public.people from authenticated;
grant update (full_name) on public.people to authenticated;

-- Force applies RLS to the table owner too, so nothing but an explicit bypass role skips it.
alter table public.organizations enable row level security;
alter table public.organizations force row level security;
alter table public.people enable row level security;
alter table public.people force row level security;
alter table public.notes enable row level security;
alter table public.notes force row level security;
alter table public.vault_test enable row level security;
alter table public.vault_test force row level security;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- Select only, and only for authenticated. With no write policies, RLS refuses all writes,
-- and with no anon policies, a signed-out caller gets no rows. vault_test has none on purpose.

-- The helpers sit inside (select ...) and receive no row values, so each runs once per query as
-- an InitPlan rather than once per row, and the path and people.org_id indexes stay usable.

-- You can see yourself, plus everyone strictly below you. Your own teammates are not below you.
create policy people_select on public.people
for select to authenticated
using (id = (select auth.uid()) or org_id = any (array(select private.org_ids_below_me())));

-- You can see your own org, so you can name where you sit, plus every org below it.
-- This is deliberately inclusive: <@ matches the org itself as well as its descendants.
create policy organizations_select on public.organizations
for select to authenticated
using (path <@ (select private.my_org_path()));

-- The same rule as people, reused unchanged on different data.
create policy notes_select on public.notes
for select to authenticated
using (org_id = any (array(select private.org_ids_below_me())));
