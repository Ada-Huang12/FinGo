-- Fix RLS infinite recursion that caused profiles queries to return HTTP 500
-- (goals ↔ goal_members policies queried each other under RLS).
-- Run this in the Supabase SQL Editor after 001 and 002.

-- Helpers run as SECURITY DEFINER so membership checks skip RLS recursion.
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
drop policy if exists "Users can view friends' profiles" on public.profiles;
create policy "Users can view friends' profiles"
  on public.profiles for select using (public.is_accepted_friend(profiles.id));

drop policy if exists "Users can view shared-goal member profiles" on public.profiles;
create policy "Users can view shared-goal member profiles"
  on public.profiles for select using (public.shares_goal_with(profiles.id));

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = profiles.id);

-- Goals
drop policy if exists "Goals select" on public.goals;
create policy "Goals select" on public.goals for select using (
  auth.uid() = goals.owner_id or public.is_goal_member(goals.id)
);

drop policy if exists "Goals update" on public.goals;
create policy "Goals update" on public.goals for update using (
  auth.uid() = goals.owner_id or public.is_goal_member(goals.id)
);

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

-- Contributions
drop policy if exists "Contributions select" on public.goal_contributions;
create policy "Contributions select" on public.goal_contributions for select using (
  public.is_goal_member(goal_contributions.goal_id)
);

drop policy if exists "Contributions insert" on public.goal_contributions;
create policy "Contributions insert" on public.goal_contributions for insert with check (
  auth.uid() = goal_contributions.user_id
  and public.is_goal_member(goal_contributions.goal_id)
);
