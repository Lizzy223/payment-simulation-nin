-- Run this in Supabase: Dashboard > SQL Editor > New query

create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  text not null unique,
  customer_name   text not null,
  customer_email  text not null,
  amount          integer not null,            -- smallest currency unit (cents)
  currency        text not null default 'USD',
  card_brand      text,
  card_last4      text,
  status          text not null default 'succeeded',
  items           jsonb,
  created_at      timestamptz not null default now()
);

alter table public.payments enable row level security;

-- DEMO ONLY: lets the browser (anon key) insert and read rows.
-- For a real app, remove these and write through a secured backend.
create policy "demo anon insert" on public.payments
  for insert to anon with check (true);

create policy "demo anon read" on public.payments
  for select to anon using (true);
