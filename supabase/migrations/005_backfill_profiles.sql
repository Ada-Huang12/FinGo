-- Backfill profiles for auth users who signed up before the profiles
-- table/trigger existed (friendship inserts require both users in profiles).

insert into public.profiles (id, email, full_name, avatar_url, points, avatar_skin, avatar_equipped, owned_accessories)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email, 'user'), '@', 1)),
  u.raw_user_meta_data->>'avatar_url',
  0,
  'peach',
  '{"hat":null,"glasses":null,"scarf":null,"pet":null,"cheeks":null,"backdrop":null}'::jsonb,
  '{}'::text[]
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
