-- FinGo initial schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)
-- Or via: supabase db push / migration

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  points integer not null default 0,
  avatar_skin text not null default 'peach',
  avatar_equipped jsonb not null default '{"hat":null,"glasses":null,"scarf":null,"pet":null,"cheeks":null,"backdrop":null}'::jsonb,
  owned_accessories text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  description text not null default '',
  date date not null default current_date,
  created_at timestamptz not null default now()
);

-- Budgets (monthly category budgets)
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  limit_amount numeric(12, 2) not null check (limit_amount >= 0),
  spent_amount numeric(12, 2) not null default 0 check (spent_amount >= 0),
  month text not null, -- YYYY-MM
  created_at timestamptz not null default now(),
  unique (user_id, category, month)
);

-- Bills
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue')),
  category text not null default 'Utilities',
  icon text not null default 'receipt_long',
  created_at timestamptz not null default now()
);

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('weekly', 'monthly', 'yearly')),
  next_billing_date date not null,
  active boolean not null default true,
  icon text not null default 'subscriptions',
  color text not null default '#3B82F6',
  created_at timestamptz not null default now()
);

-- Savings goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  deadline date,
  is_collaborative boolean not null default false,
  icon text not null default 'savings',
  color text not null default '#22C55E',
  points_awarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- Goal members (shared goals)
create table if not exists public.goal_members (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (goal_id, user_id)
);

-- Goal contributions
create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

-- Friendships
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- Challenges / social activity
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  goal_amount numeric(12, 2),
  ends_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  progress numeric(12, 2) not null default 0,
  unique (challenge_id, user_id)
);

-- AI Coach messages (optional persistence)
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_transactions_user on public.transactions (user_id, date desc);
create index if not exists idx_budgets_user on public.budgets (user_id, month);
create index if not exists idx_bills_user on public.bills (user_id, due_date);
create index if not exists idx_subscriptions_user on public.subscriptions (user_id);
create index if not exists idx_goals_owner on public.goals (owner_id);
create index if not exists idx_goal_members_user on public.goal_members (user_id);
create index if not exists idx_friendships_req on public.friendships (requester_id);
create index if not exists idx_friendships_addr on public.friendships (addressee_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, points, avatar_skin, avatar_equipped, owned_accessories)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    120,
    'peach',
    '{"hat":null,"glasses":null,"scarf":null,"pet":null,"cheeks":"cheeks-blush","backdrop":null}'::jsonb,
    array['cheeks-blush']
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep goal current_amount in sync with contributions
create or replace function public.refresh_goal_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.goals
  set current_amount = (
    select coalesce(sum(amount), 0) from public.goal_contributions where goal_id = coalesce(new.goal_id, old.goal_id)
  )
  where id = coalesce(new.goal_id, old.goal_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_contribution_change on public.goal_contributions;
create trigger on_contribution_change
  after insert or update or delete on public.goal_contributions
  for each row execute function public.refresh_goal_amount();

-- =====================
-- Row Level Security
-- =====================
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.bills enable row level security;
alter table public.subscriptions enable row level security;
alter table public.goals enable row level security;
alter table public.goal_members enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.friendships enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.ai_messages enable row level security;

-- SECURITY DEFINER helpers avoid RLS recursion between related tables
create or replace function public.is_goal_owner(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.goals g
    where g.id = p_goal_id and g.owner_id = auth.uid()
  );
$$;

create or replace function public.is_goal_member(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_goal_owner(p_goal_id)
    or exists (
      select 1 from public.goal_members gm
      where gm.goal_id = p_goal_id and gm.user_id = auth.uid()
    );
$$;

create or replace function public.shares_goal_with(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.goal_members gm_self
    join public.goal_members gm_other on gm_self.goal_id = gm_other.goal_id
    where gm_self.user_id = auth.uid()
      and gm_other.user_id = p_other_user_id
  );
$$;

create or replace function public.is_accepted_friend(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = p_other_user_id)
        or (f.addressee_id = auth.uid() and f.requester_id = p_other_user_id)
      )
  );
$$;

-- Profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = profiles.id);
drop policy if exists "Users can view friends' profiles" on public.profiles;
create policy "Users can view friends' profiles"
  on public.profiles for select using (public.is_accepted_friend(profiles.id));
drop policy if exists "Users can view shared-goal member profiles" on public.profiles;
create policy "Users can view shared-goal member profiles"
  on public.profiles for select using (public.shares_goal_with(profiles.id));
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = profiles.id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = profiles.id);

-- Transactions (private)
drop policy if exists "Own transactions select" on public.transactions;
create policy "Own transactions select" on public.transactions for select using (auth.uid() = user_id);
drop policy if exists "Own transactions insert" on public.transactions;
create policy "Own transactions insert" on public.transactions for insert with check (auth.uid() = user_id);
drop policy if exists "Own transactions update" on public.transactions;
create policy "Own transactions update" on public.transactions for update using (auth.uid() = user_id);
drop policy if exists "Own transactions delete" on public.transactions;
create policy "Own transactions delete" on public.transactions for delete using (auth.uid() = user_id);

-- Budgets (private)
drop policy if exists "Own budgets select" on public.budgets;
create policy "Own budgets select" on public.budgets for select using (auth.uid() = user_id);
drop policy if exists "Own budgets insert" on public.budgets;
create policy "Own budgets insert" on public.budgets for insert with check (auth.uid() = user_id);
drop policy if exists "Own budgets update" on public.budgets;
create policy "Own budgets update" on public.budgets for update using (auth.uid() = user_id);
drop policy if exists "Own budgets delete" on public.budgets;
create policy "Own budgets delete" on public.budgets for delete using (auth.uid() = user_id);

-- Bills (private)
drop policy if exists "Own bills select" on public.bills;
create policy "Own bills select" on public.bills for select using (auth.uid() = user_id);
drop policy if exists "Own bills insert" on public.bills;
create policy "Own bills insert" on public.bills for insert with check (auth.uid() = user_id);
drop policy if exists "Own bills update" on public.bills;
create policy "Own bills update" on public.bills for update using (auth.uid() = user_id);
drop policy if exists "Own bills delete" on public.bills;
create policy "Own bills delete" on public.bills for delete using (auth.uid() = user_id);

-- Subscriptions (private)
drop policy if exists "Own subs select" on public.subscriptions;
create policy "Own subs select" on public.subscriptions for select using (auth.uid() = user_id);
drop policy if exists "Own subs insert" on public.subscriptions;
create policy "Own subs insert" on public.subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "Own subs update" on public.subscriptions;
create policy "Own subs update" on public.subscriptions for update using (auth.uid() = user_id);
drop policy if exists "Own subs delete" on public.subscriptions;
create policy "Own subs delete" on public.subscriptions for delete using (auth.uid() = user_id);

-- Goals: owner or member
drop policy if exists "Goals select" on public.goals;
create policy "Goals select" on public.goals for select using (
  auth.uid() = goals.owner_id or public.is_goal_member(goals.id)
);
drop policy if exists "Goals insert" on public.goals;
create policy "Goals insert" on public.goals for insert with check (auth.uid() = goals.owner_id);
drop policy if exists "Goals update" on public.goals;
create policy "Goals update" on public.goals for update using (
  auth.uid() = goals.owner_id or public.is_goal_member(goals.id)
);
drop policy if exists "Goals delete" on public.goals;
create policy "Goals delete" on public.goals for delete using (auth.uid() = goals.owner_id);

-- Goal members
drop policy if exists "Goal members select" on public.goal_members;
create policy "Goal members select" on public.goal_members for select using (
  public.is_goal_member(goal_members.goal_id)
);
drop policy if exists "Goal members insert by owner" on public.goal_members;
create policy "Goal members insert by owner" on public.goal_members for insert with check (
  public.is_goal_owner(goal_members.goal_id)
  or goal_members.user_id = auth.uid()
);
drop policy if exists "Goal members delete" on public.goal_members;
create policy "Goal members delete" on public.goal_members for delete using (
  goal_members.user_id = auth.uid()
  or public.is_goal_owner(goal_members.goal_id)
);

-- Contributions: visible to goal members
drop policy if exists "Contributions select" on public.goal_contributions;
create policy "Contributions select" on public.goal_contributions for select using (
  public.is_goal_member(goal_contributions.goal_id)
);
drop policy if exists "Contributions insert" on public.goal_contributions;
create policy "Contributions insert" on public.goal_contributions for insert with check (
  auth.uid() = goal_contributions.user_id
  and public.is_goal_member(goal_contributions.goal_id)
);

-- Friendships
drop policy if exists "Friendships select" on public.friendships;
create policy "Friendships select" on public.friendships for select using (
  auth.uid() = requester_id or auth.uid() = addressee_id
);
drop policy if exists "Friendships insert" on public.friendships;
create policy "Friendships insert" on public.friendships for insert with check (auth.uid() = requester_id);
drop policy if exists "Friendships update" on public.friendships;
create policy "Friendships update" on public.friendships for update using (
  auth.uid() = addressee_id or auth.uid() = requester_id
);
drop policy if exists "Friendships delete" on public.friendships;
create policy "Friendships delete" on public.friendships for delete using (
  auth.uid() = requester_id or auth.uid() = addressee_id
);

-- Challenges
drop policy if exists "Challenges select" on public.challenges;
create policy "Challenges select" on public.challenges for select using (
  auth.uid() = challenges.creator_id
  or exists (select 1 from public.challenge_participants cp where cp.challenge_id = challenges.id and cp.user_id = auth.uid())
  or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = challenges.creator_id)
        or (f.addressee_id = auth.uid() and f.requester_id = challenges.creator_id))
  )
);
drop policy if exists "Challenges insert" on public.challenges;
create policy "Challenges insert" on public.challenges for insert with check (auth.uid() = challenges.creator_id);

drop policy if exists "Challenge participants select" on public.challenge_participants;
create policy "Challenge participants select" on public.challenge_participants for select using (
  auth.uid() = challenge_participants.user_id
  or exists (select 1 from public.challenges c where c.id = challenge_participants.challenge_id and c.creator_id = auth.uid())
);
drop policy if exists "Challenge participants insert" on public.challenge_participants;
create policy "Challenge participants insert" on public.challenge_participants for insert with check (auth.uid() = challenge_participants.user_id);
drop policy if exists "Challenge participants update" on public.challenge_participants;
create policy "Challenge participants update" on public.challenge_participants for update using (auth.uid() = challenge_participants.user_id);

-- AI messages (private)
drop policy if exists "AI select" on public.ai_messages;
create policy "AI select" on public.ai_messages for select using (auth.uid() = user_id);
drop policy if exists "AI insert" on public.ai_messages;
create policy "AI insert" on public.ai_messages for insert with check (auth.uid() = user_id);
drop policy if exists "AI delete" on public.ai_messages;
create policy "AI delete" on public.ai_messages for delete using (auth.uid() = user_id);
