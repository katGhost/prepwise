-- prepWise — minimal, demo-scoped schema.
-- Single demo household; no multi-tenant auth needed for the MVP.
-- Run this once in the Supabase SQL editor, then run seed.sql (below, same file).

create table if not exists households (
  id text primary key,
  name text not null,
  electricity_budget numeric not null default 0,
  food_budget numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists budget_categories (
  id text primary key,
  household_id text not null references households(id) on delete cascade,
  category text not null,              -- 'food' | 'electricity' | 'household' | ...
  limit_amount numeric not null,
  spent_amount numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references households(id) on delete cascade,
  type text not null check (type in ('electricity', 'water')),
  status text not null default 'active',
  triggered_at timestamptz not null default now()
);

create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  household_id text not null,          -- denormalised for direct cache lookup by (household_id, event_type)
  event_type text not null,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_budget_categories_household on budget_categories(household_id);
create index if not exists idx_events_household on events(household_id);
create index if not exists idx_insights_lookup on insights(household_id, event_type);

-- Row Level Security: locked down. All access goes through Flask with the
-- service-role key, which bypasses RLS entirely — this is the deliberate
-- "no direct client access" boundary described in the project context.
alter table households enable row level security;
alter table budget_categories enable row level security;
alter table events enable row level security;
alter table insights enable row level security;
-- (no policies added = no anon/authenticated access; service-role bypasses RLS)

-- ---------------------------------------------------------------------------
-- Seed data — the one demo household, matching backend/services/supabase_client.py
-- mock data exactly, so swapping mock -> real Supabase changes nothing visible.
-- ---------------------------------------------------------------------------

insert into households (id, name, electricity_budget, food_budget) values
  ('demo-household-001', 'The Mahlangu Household', 1200.0, 2500.0)
on conflict (id) do nothing;

insert into budget_categories (id, household_id, category, limit_amount, spent_amount) values
  ('cat-food', 'demo-household-001', 'food', 2500.0, 2100.0),
  ('cat-electricity', 'demo-household-001', 'electricity', 1200.0, 950.0),
  ('cat-household', 'demo-household-001', 'household', 600.0, 550.0)
on conflict (id) do nothing;

-- Pre-generated insight cache so the demo never depends on a live LLM call.
insert into insights (event_id, household_id, event_type, text) values
  (null, 'demo-household-001', 'electricity',
   'Electricity spending is already 18% above your normal monthly average this cycle. This outage is unlikely to touch your savings goal, but your food budget is the one to watch — past outages have pushed takeaway spend up fast once cooking gets harder.'),
  (null, 'demo-household-001', 'water',
   'Your household budget has room to absorb this one, but your household-essentials category is already at 92% of its monthly limit. Past water disruptions here have meant last-minute bottled water purchases at a premium — buying a few bottles now, ahead of time, is the cheaper move.');
