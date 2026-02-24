-- Koshnitsa: Shopping lists tables setup
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/lejmwmryfkxuztfhinsj/sql)
-- IMPORTANT: After running this SQL, enable Realtime on the list_items table:
--   Table Editor → list_items → Enable Realtime toggle

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Lists table
create table public.lists (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_by uuid references auth.users on delete cascade not null,
  join_code text unique not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  is_archived boolean not null default false,
  created_at timestamptz default now() not null
);

-- List members table (links users to lists)
create table public.list_members (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references public.lists on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  joined_at timestamptz default now() not null,
  unique(list_id, user_id)
);

-- List items table
create table public.list_items (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references public.lists on delete cascade not null,
  added_by uuid references auth.users on delete set null,
  name text not null,
  quantity text default '1x',
  note text,
  category text not null default 'Друго',
  is_checked boolean default false not null,
  created_at timestamptz default now() not null,
  checked_at timestamptz,
  checked_by uuid references auth.users on delete set null
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

create index idx_list_members_user_id on public.list_members(user_id);
create index idx_list_members_list_id on public.list_members(list_id);
create index idx_list_items_list_id on public.list_items(list_id);
create index idx_lists_join_code on public.lists(join_code);

-- ============================================================
-- 3. SECURITY DEFINER FUNCTION (avoids RLS recursion)
-- ============================================================

-- This function checks membership without triggering RLS on list_members.
-- Used by all policies that need to verify "is this user a member of this list?"
create or replace function public.is_list_member(p_list_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.list_members
    where list_id = p_list_id
    and user_id = (select auth.uid())
  );
$$;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.list_items enable row level security;

-- --- LISTS policies ---
create policy "Users can view lists they belong to"
  on public.lists for select
  using (public.is_list_member(id));

create policy "Authenticated users can create lists"
  on public.lists for insert
  with check (auth.uid() = created_by);

create policy "List creators can update their lists"
  on public.lists for update
  using (auth.uid() = created_by);

-- Permissive policy for join-code lookup
create policy "Anyone can look up a list by join code"
  on public.lists for select
  using (true);

-- --- LIST MEMBERS policies ---
create policy "Users can view members of their lists"
  on public.list_members for select
  using (public.is_list_member(list_id));

create policy "Users can join lists"
  on public.list_members for insert
  with check (auth.uid() = user_id);

-- --- LIST ITEMS policies ---
create policy "Users can view items in their lists"
  on public.list_items for select
  using (public.is_list_member(list_id));

create policy "Members can add items to their lists"
  on public.list_items for insert
  with check (public.is_list_member(list_id));

create policy "Members can update items in their lists"
  on public.list_items for update
  using (public.is_list_member(list_id));

create policy "Members can delete items in their lists"
  on public.list_items for delete
  using (public.is_list_member(list_id));
