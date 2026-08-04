-- Avatar shop + goal completion points
-- Run after 001_initial_schema.sql

alter table public.profiles
  add column if not exists points integer not null default 0,
  add column if not exists avatar_skin text not null default 'peach',
  add column if not exists avatar_equipped jsonb not null default '{"hat":null,"glasses":null,"scarf":null,"pet":null,"cheeks":null,"backdrop":null}'::jsonb,
  add column if not exists owned_accessories text[] not null default '{}';

alter table public.goals
  add column if not exists points_awarded boolean not null default false;

-- New accounts start empty (0 points, no accessories).
-- Points are earned by completing savings goals.
