-- ============================================================
-- AJ & MELISSA — HOUSEHOLD LEDGER · Supabase schema
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1) The shared household. All app data lives in one JSON column,
--    which matches the app's single-state-object design exactly.
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Our Ledger',
  state       jsonb not null default '{}'::jsonb,
  client_id   text,                          -- which browser tab wrote last (echo suppression)
  updated_at  timestamptz not null default now()
);

-- 2) Who belongs to which household (you and AJ).
create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  primary key (household_id, user_id)
);

-- 3) Row Level Security — the actual lock on the door.
--    Even though the anon API key ships in the frontend, these
--    policies mean a signed-in user can ONLY touch households
--    they are a member of. Everyone else gets nothing.
alter table public.households        enable row level security;
alter table public.household_members enable row level security;

create policy "members can read own membership"
  on public.household_members for select
  using (auth.uid() = user_id);

create policy "members can read their household"
  on public.households for select
  using (
    exists (
      select 1 from public.household_members m
      where m.household_id = households.id and m.user_id = auth.uid()
    )
  );

create policy "members can update their household"
  on public.households for update
  using (
    exists (
      select 1 from public.household_members m
      where m.household_id = households.id and m.user_id = auth.uid()
    )
  );

-- 4) Turn on realtime broadcasting for the households table,
--    so each partner's saves are pushed to the other instantly.
alter publication supabase_realtime add table public.households;

-- 5) Create your household (empty state — the app seeds the July
--    data the first time one of you opens it).
insert into public.households (name) values ('AJ & Melissa');


-- ============================================================
-- MEMBERSHIP — run this part LATER (step 6 of the guide),
-- AFTER both of you have signed in to the app once, so your
-- accounts exist in auth.users. Replace the two emails.
-- ============================================================
--
-- insert into public.household_members (household_id, user_id)
-- select h.id, u.id
-- from public.households h, auth.users u
-- where h.name = 'AJ & Melissa'
--   and u.email in ('melissa@example.com', 'aj@example.com');
