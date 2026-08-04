-- New accounts start with a clean slate (0 points, empty inventory).
-- Run in the Supabase SQL Editor after previous migrations.

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
    0,
    'peach',
    '{"hat":null,"glasses":null,"scarf":null,"pet":null,"cheeks":null,"backdrop":null}'::jsonb,
    '{}'::text[]
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Keep trigger attached (safe if it already exists)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
