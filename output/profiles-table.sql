-- Koshnitsa: profiles table setup
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/lejmwmryfkxuztfhinsj/sql)

-- 1. Create the profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  display_name text,
  created_at timestamptz default now() not null
);

-- 2. Enable Row Level Security
alter table public.profiles enable row level security;

-- 3. Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- 4. Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 5. Automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
