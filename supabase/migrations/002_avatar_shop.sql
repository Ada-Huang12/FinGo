-- Avatar shop + goal completion points
-- Run after 001_initial_schema.sql

alter table public.profiles
  add column if not exists points integer not null default 0,
  add column if not exists avatar_skin text not null default 'peach',
  add column if not exists avatar_equipped jsonb not null default '{"hat":null,"glasses":null,"scarf":null,"pet":null,"cheeks":null,"backdrop":null}'::jsonb,
  add column if not exists owned_accessories text[] not null default '{}';

alter table public.goals
  add column if not exists points_awarded boolean not null default false;

-- Give existing users a starter pack (safe to re-run; only fills empty inventories)
update public.profiles
set
  points = greatest(points, 120),
  owned_accessories = case
    when cardinality(owned_accessories) = 0 then array['cheeks-blush']
    else owned_accessories
  end,
  avatar_equipped = case
    when avatar_equipped->>'cheeks' is null
      then jsonb_set(avatar_equipped, '{cheeks}', '"cheeks-blush"')
    else avatar_equipped
  end
where points = 0 or cardinality(owned_accessories) = 0;
