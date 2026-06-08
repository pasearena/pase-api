-- Pase Arena — Supabase schema
-- Run this in the Supabase SQL editor.

create table if not exists fights (
  id uuid primary key default gen_random_uuid(),
  thesis text not null,
  blue text not null,
  red text not null,
  winner text not null,            -- 'blue' | 'red' | 'draw'
  winner_name text not null,
  method text not null,            -- 'KO' | 'decision' | 'draw'
  ko_round int,
  hp_blue int not null,
  hp_red int not null,
  punches jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists fights_created_idx on fights (created_at desc);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  wallet text unique,
  created_at timestamptz not null default now()
);

-- RLS: lock both tables. The API uses the service-role key, which bypasses RLS.
-- The anon key (frontend) gets no direct access; everything goes through the API.
alter table fights enable row level security;
alter table waitlist enable row level security;

-- (Optional) allow public read of fights for a client-side leaderboard.
-- Uncomment if you ever want the frontend to read directly with the anon key:
-- create policy "public read fights" on fights for select using (true);
