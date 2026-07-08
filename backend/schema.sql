-- AgentWork Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ── TASKS table ──────────────────────────────────────────────
create table if not exists tasks (
  id              uuid default gen_random_uuid() primary key,
  title           text not null,
  description     text not null,
  category        text not null default 'research',
  bounty          integer not null,
  deadline        text not null default '6 hours',
  status          text not null default 'open',
  poster_address  text not null,
  poster_nametag  text,
  agent_address   text,
  agent_nametag   text,
  winner_address  text,
  winner_nametag  text,
  result          text,
  tx_id           text,
  delivered_at    timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz default now()
);

-- ── BIDS table ───────────────────────────────────────────────
create table if not exists bids (
  id              uuid default gen_random_uuid() primary key,
  task_id         uuid references tasks(id) on delete cascade,
  agent_address   text not null,
  agent_nametag   text,
  amount          integer not null,
  created_at      timestamptz default now()
);

-- ── ACTIVITY table ───────────────────────────────────────────
create table if not exists activity (
  id              uuid default gen_random_uuid() primary key,
  type            text not null,
  text            text not null,
  color           text default '#4f7fff',
  created_at      timestamptz default now()
);

-- ── ROW LEVEL SECURITY (RLS) ─────────────────────────────────
-- Enable RLS on all tables
alter table tasks    enable row level security;
alter table bids     enable row level security;
alter table activity enable row level security;

-- Allow public read access (anyone can view tasks and bids)
create policy "Public read tasks"
  on tasks for select using (true);

create policy "Public read bids"
  on bids for select using (true);

create policy "Public read activity"
  on activity for select using (true);

-- Allow inserts from authenticated and anon users
create policy "Anyone can post tasks"
  on tasks for insert with check (true);

create policy "Anyone can place bids"
  on bids for insert with check (true);

create policy "Anyone can log activity"
  on activity for insert with check (true);

-- Allow updates (for marking complete, claiming, delivering)
create policy "Anyone can update tasks"
  on tasks for update using (true);

-- ── SEED DATA — sample tasks to start with ──────────────────
insert into tasks (title, description, category, bounty, deadline, poster_address, poster_nametag) values
(
  'Analyse Q2 2026 DeFi market trends and write a 1,500-word report',
  'Comprehensive analysis of DeFi TVL changes, top protocols, and emerging narratives in Q2 2026. Include key metrics and an outlook for Q3.',
  'research',
  320,
  '3 hours',
  '0xdemo_poster_1',
  '@satoshi.eth'
),
(
  'Write 10 tweet threads explaining Unicity off-chain execution in simple terms',
  'Target audience: non-technical crypto users. Each thread: 5–8 tweets. Cover self-authenticating tokens, agent OS, and why no gas is needed.',
  'writing',
  180,
  '6 hours',
  '0xdemo_poster_2',
  '@builder42'
),
(
  'Summarise the Unicity whitepaper into a 500-word executive brief',
  'Target: busy VC partners. Cover the problem with shared ledgers, Unicity off-chain approach, 5-layer architecture, and why it matters for autonomous agents.',
  'writing',
  95,
  '1 hour',
  '0xdemo_poster_3',
  '@unicorn.vc'
),
(
  'Research the top 10 autonomous AI agent frameworks in 2026',
  'Compare: LangChain, AutoGPT, CrewAI, and others. Cover: language, active maintainers, GitHub stars, unique features, and best use cases. Deliver a comparison table.',
  'research',
  150,
  '4 hours',
  '0xdemo_poster_4',
  '@techresearch'
);

-- ── INDEXES for performance ───────────────────────────────────
create index if not exists tasks_status_idx    on tasks(status);
create index if not exists tasks_created_idx   on tasks(created_at desc);
create index if not exists bids_task_id_idx    on bids(task_id);
create index if not exists activity_created_idx on activity(created_at desc);
