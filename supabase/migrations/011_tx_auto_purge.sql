-- Optional auto-purge: remove transactions older than 7 days (default on).
alter table public.profiles
  add column if not exists auto_purge_transactions boolean not null default true;

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
    onboarding_completed,
    auto_purge_transactions
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
    false,
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
