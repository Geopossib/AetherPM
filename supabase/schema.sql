-- AetherPM cloud layer schema.
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a
-- fresh Supabase project. Requires Supabase Auth already enabled
-- (it is, by default) since these tables reference auth.users.

-- One row per user. Created automatically on signup via the trigger
-- below, so the app never has to remember to create it.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  plan_renewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Storage quota tracking. used_bytes is only ever written by Edge
-- Functions (via the service role key, which bypasses RLS) -- the
-- client can read its own row but cannot update it, so a compromised
-- client can't grant itself more quota.
create table if not exists public.storage_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  used_bytes bigint not null default 0,
  limit_bytes bigint not null default 524288000, -- 500 MB free-tier default
  updated_at timestamptz not null default now()
);

-- One row per shared file. share_code is the short string a recipient
-- enters (or that's embedded in a share link) to resolve to the
-- underlying object without ever exposing the raw Contabo object key
-- or credentials to the client directly.
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  object_key text not null,
  project_name text not null,
  recipient_email text,
  share_code text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

create index if not exists idx_shares_owner on public.shares(owner_id);
create index if not exists idx_shares_recipient on public.shares(recipient_email);
create index if not exists idx_shares_code on public.shares(share_code);

-- ---------------------------------------------------------------
-- Row Level Security: every table is locked down by default; the
-- policies below are the only ways to read/write, and they run as
-- the requesting user's own identity, not a shared app-level login.
-- ---------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.storage_usage enable row level security;
alter table public.shares enable row level security;

create policy "users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users read own storage usage"
  on public.storage_usage for select
  using (auth.uid() = user_id);
-- Deliberately no insert/update/delete policy for storage_usage: only
-- the service role (used exclusively inside Edge Functions) can
-- write it, which is what makes the quota trustworthy.

create policy "users read own shares"
  on public.shares for select
  using (
    auth.uid() = owner_id
    or recipient_email = (select email from auth.users where id = auth.uid())
    or recipient_email is null -- code-only shares are resolved via share_code lookup in the Edge Function, not a direct table read
  );

create policy "users create their own shares"
  on public.shares for insert
  with check (auth.uid() = owner_id);

create policy "owners delete their own shares"
  on public.shares for delete
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------
-- Auto-provision a profile + default storage quota row when someone
-- signs up, so the app never has to do a separate "create my account
-- row" call after auth signup succeeds.
-- ---------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.storage_usage (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
