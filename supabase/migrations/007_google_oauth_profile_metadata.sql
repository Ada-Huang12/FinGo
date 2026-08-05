-- Prefer Google OAuth `name` / `picture` when creating profiles.
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
    'peach',
    '{"hat":null,"glasses":null,"scarf":null,"pet":null,"cheeks":null,"backdrop":null}'::jsonb,
    '{}'::text[]
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
