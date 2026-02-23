-- Koshnitsa: Usual Items + List History tables
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/lejmwmryfkxuztfhinsj/sql)

-- ============================================================
-- 1. ADD archived COLUMN TO lists TABLE
-- ============================================================

alter table public.lists
  add column is_archived boolean not null default false;

-- ============================================================
-- 2. USUAL ITEMS TABLE
-- ============================================================

create table public.usual_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  quantity text default '1x',
  category text not null default 'Друго',
  created_at timestamptz default now() not null
);

create index idx_usual_items_user_id on public.usual_items(user_id);

-- Enable RLS
alter table public.usual_items enable row level security;

-- Users can only see their own usual items
create policy "Users can view own usual items"
  on public.usual_items for select
  using (auth.uid() = user_id);

-- Users can insert their own usual items
create policy "Users can create own usual items"
  on public.usual_items for insert
  with check (auth.uid() = user_id);

-- Users can delete their own usual items
create policy "Users can delete own usual items"
  on public.usual_items for delete
  using (auth.uid() = user_id);

-- Users can update their own usual items
create policy "Users can update own usual items"
  on public.usual_items for update
  using (auth.uid() = user_id);

-- ============================================================
-- 3. LIST SNAPSHOTS TABLE (completed shopping trips)
-- ============================================================

create table public.list_snapshots (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references public.lists on delete set null,
  list_name text not null,
  user_id uuid references auth.users on delete cascade not null,
  items jsonb not null default '[]'::jsonb,
  store_name text,
  completed_at timestamptz default now() not null
);

create index idx_list_snapshots_user_id on public.list_snapshots(user_id);
create index idx_list_snapshots_completed_at on public.list_snapshots(completed_at desc);

-- Enable RLS
alter table public.list_snapshots enable row level security;

-- Users can only see their own snapshots
create policy "Users can view own snapshots"
  on public.list_snapshots for select
  using (auth.uid() = user_id);

-- Users can insert their own snapshots
create policy "Users can create own snapshots"
  on public.list_snapshots for insert
  with check (auth.uid() = user_id);
