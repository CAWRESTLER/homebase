-- Homebase - project tracker schema
-- Public (anon) can READ; only users listed in public.editors can WRITE.
-- Run this in Supabase -> SQL Editor (or `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables
create table if not exists public.areas (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(btrim(name)) between 1 and 120),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(btrim(title)) between 1 and 300),
  area          text not null references public.areas(name) on update cascade on delete restrict,
  priority      text not null default 'Normal' check (priority in ('High', 'Normal', 'Low')),
  assignee      text null check (assignee is null or char_length(assignee) <= 120),
  done          boolean not null default false,
  completed_at  timestamptz null,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tasks_area_idx on public.tasks (area);
create index if not exists tasks_sort_idx on public.tasks (sort_order);

-- Who may edit. Add the owner with:
--   insert into public.editors (email) values ('you@example.com');
create table if not exists public.editors (
  email       text primary key check (email = lower(email)),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- helper
-- SECURITY DEFINER so it can read editors even though editors has no public SELECT policy.
create or replace function public.is_editor()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.editors e
    where e.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to anon, authenticated;

-- ---------------------------------------------------------------- RLS
alter table public.areas   enable row level security;
alter table public.tasks   enable row level security;
alter table public.editors enable row level security;

-- areas
drop policy if exists "areas public read" on public.areas;
create policy "areas public read" on public.areas for select to anon, authenticated using (true);
drop policy if exists "areas editor insert" on public.areas;
create policy "areas editor insert" on public.areas for insert to authenticated with check (public.is_editor());
drop policy if exists "areas editor update" on public.areas;
create policy "areas editor update" on public.areas for update to authenticated using (public.is_editor()) with check (public.is_editor());
drop policy if exists "areas editor delete" on public.areas;
create policy "areas editor delete" on public.areas for delete to authenticated using (public.is_editor());

-- tasks
drop policy if exists "tasks public read" on public.tasks;
create policy "tasks public read" on public.tasks for select to anon, authenticated using (true);
drop policy if exists "tasks editor insert" on public.tasks;
create policy "tasks editor insert" on public.tasks for insert to authenticated with check (public.is_editor());
drop policy if exists "tasks editor update" on public.tasks;
create policy "tasks editor update" on public.tasks for update to authenticated using (public.is_editor()) with check (public.is_editor());
drop policy if exists "tasks editor delete" on public.tasks;
create policy "tasks editor delete" on public.tasks for delete to authenticated using (public.is_editor());

-- editors: a signed-in user may see only their own row; nobody can write via the API
-- (manage this table from the SQL editor / dashboard, which bypasses RLS).
drop policy if exists "editors self read" on public.editors;
create policy "editors self read" on public.editors for select to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Table privileges (RLS still applies on top of these).
grant select on public.areas, public.tasks to anon, authenticated;
grant insert, update, delete on public.areas, public.tasks to authenticated;
grant select on public.editors to authenticated;
revoke insert, update, delete on public.editors from anon, authenticated;

-- ---------------------------------------------------------------- atomic import / reset
-- Runs as the caller (SECURITY INVOKER) so RLS applies, plus an explicit editor check.
create or replace function public.replace_all(p_areas jsonb, p_tasks jsonb)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_editor() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  delete from public.tasks where true;
  delete from public.areas where true;

  insert into public.areas (id, name, sort_order)
  select coalesce((a->>'id')::uuid, gen_random_uuid()), a->>'name', coalesce((a->>'sort_order')::int, 0)
  from jsonb_array_elements(coalesce(p_areas, '[]'::jsonb)) a;

  -- make sure every task's area exists
  insert into public.areas (name, sort_order)
  select distinct t->>'area', 1000
  from jsonb_array_elements(coalesce(p_tasks, '[]'::jsonb)) t
  where not exists (select 1 from public.areas x where x.name = t->>'area');

  insert into public.tasks (id, title, area, priority, assignee, done, completed_at, sort_order, created_at)
  select
    coalesce((t->>'id')::uuid, gen_random_uuid()),
    t->>'title',
    t->>'area',
    coalesce(t->>'priority', 'Normal'),
    nullif(t->>'assignee', ''),
    coalesce((t->>'done')::boolean, false),
    (t->>'completed_at')::timestamptz,
    coalesce((t->>'sort_order')::int, 0),
    coalesce((t->>'created_at')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_tasks, '[]'::jsonb)) t;
end $$;
revoke all on function public.replace_all(jsonb, jsonb) from public, anon;
grant execute on function public.replace_all(jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------- realtime
-- Lets public viewers see changes live.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.tasks;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.areas;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
