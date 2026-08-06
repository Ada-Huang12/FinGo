-- Gamification: lifetime XP for leveling + claimable personal quests.
-- Run after 008_coach_onboarding_prefs.sql

alter table public.profiles
  add column if not exists xp integer not null default 0;

create table if not exists public.quest_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quest_id text not null,
  period_key text not null,
  xp_awarded integer not null check (xp_awarded > 0),
  claimed_at timestamptz not null default now(),
  unique (user_id, quest_id, period_key)
);

create index if not exists idx_quest_claims_user on public.quest_claims (user_id);

alter table public.quest_claims enable row level security;

drop policy if exists "Own quest claims select" on public.quest_claims;
create policy "Own quest claims select" on public.quest_claims
  for select using (auth.uid() = user_id);

drop policy if exists "Own quest claims insert" on public.quest_claims;
create policy "Own quest claims insert" on public.quest_claims
  for insert with check (auth.uid() = user_id);

-- Keep signup trigger in sync with profile columns.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    points,
    xp,
    avatar_skin,
    avatar_equipped,
    owned_accessories,
    coach_prefs,
    onboarding_completed
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', '')
    ),
    0,
    0,
    'peach',
    '{"hat":null,"glasses":null,"scarf":null,"pet":null,"cheeks":null,"backdrop":null}'::jsonb,
    '{}'::text[],
    '{}'::jsonb,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
