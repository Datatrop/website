-- ============================================================================
-- Datatrop — new tables for the playbook-aligned website
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- Adds two content tables the rebuilt site reads:
--   • problems        — "The Five Problems We Solve"
--   • service_lines   — "Service Lines & Deal Sizing"
--
-- Both are OPTIONAL: the website ships with the 5 built-in playbook defaults
-- and only uses these tables when they contain active rows. Running this
-- script lets you edit that content from /admin without a code deploy.
--
-- RLS mirrors the existing public-read pattern (anon can SELECT; only
-- authenticated admins can write). Safe to re-run — uses IF NOT EXISTS / drops.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PROBLEMS
-- ---------------------------------------------------------------------------
create table if not exists public.problems (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  symptoms       text,
  solution       text,
  reference_case text,
  sort_order     integer not null default 0,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table public.problems enable row level security;

drop policy if exists "problems public read"     on public.problems;
drop policy if exists "problems authenticated rw" on public.problems;

-- Anyone (anon) may read active problems for the public site.
create policy "problems public read"
  on public.problems for select
  using (active = true);

-- Signed-in admins can do everything (read drafts + write).
create policy "problems authenticated rw"
  on public.problems for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- SERVICE LINES
-- ---------------------------------------------------------------------------
create table if not exists public.service_lines (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  examples    text,
  deal_size   text,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.service_lines enable row level security;

drop policy if exists "service_lines public read"     on public.service_lines;
drop policy if exists "service_lines authenticated rw" on public.service_lines;

create policy "service_lines public read"
  on public.service_lines for select
  using (active = true);

create policy "service_lines authenticated rw"
  on public.service_lines for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- SEED DATA (playbook defaults) — optional.
-- Skip this block if you'd rather add rows from the /admin panel.
-- ---------------------------------------------------------------------------
insert into public.problems (title, symptoms, solution, reference_case, sort_order) values
  ('Fragmented Operations',
   'Excel everywhere, data duplication, manual handoffs, no visibility.',
   'Unified Business Operating Systems — ERP-like systems, custom operations systems, finance integration, inventory systems and CRM ecosystems in one connected platform.',
   'Sufi Group Unified Operations System — covering sales, procurement, inventory, dispatch, finance, accounting and HR in one platform.',
   0),
  ('Revenue Leakage',
   'Missed leads, poor follow-up, lost opportunities, low conversion.',
   'Revenue Intelligence Systems — lead scoring, AI sales assistants, follow-up engines, opportunity detection and conversion optimization.',
   null,
   1),
  ('Communication Chaos',
   'Calls on personal phones, no visibility, lost customers, no accountability.',
   'Communication Operating Systems — cloud telephony, WhatsApp centralization, AI call intelligence, contact center systems and omnichannel communication.',
   'Automotive communication system with centralized IVR, CRM tracking, dashboards and AI call intelligence.',
   2),
  ('Lack of Organizational Intelligence',
   'Knowledge trapped in employees, decisions depend on individuals, no institutional memory.',
   'Enterprise Knowledge & Memory Systems — AI memory systems, knowledge assistants, searchable enterprise knowledge bases and context-aware copilots.',
   null,
   3),
  ('High Human Dependency',
   'Repetitive work, hiring challenges, process bottlenecks.',
   'AI Workforce Systems — voice agents, AI employees, multi-agent systems and autonomous task execution.',
   'AI Voice Ecosystems capable of autonomous customer interactions with memory and specialized capabilities.',
   4);

insert into public.service_lines (name, examples, deal_size, sort_order) values
  ('Enterprise AI Systems',
   'ERP modernization, unified business platforms, custom enterprise software, department integration, operational intelligence systems.',
   '₹10L – ₹2Cr+', 0),
  ('AI Workforce & Voice Systems',
   'Voice agents, sales agents, support agents, internal assistants, multi-agent ecosystems.',
   '₹5L – ₹50L', 1),
  ('Revenue Intelligence Systems',
   'AI sales systems, lead intelligence, sales automation, customer intelligence, conversion optimization.',
   '₹3L – ₹25L', 2),
  ('Communication Intelligence Platforms',
   'Contact center systems, omnichannel communication, telephony intelligence, customer communication hubs.',
   '₹5L – ₹50L', 3),
  ('AI Product Development',
   'SaaS platforms, AI-native products, industry-specific platforms, internal commercial products.',
   'Scoped per engagement', 4);
