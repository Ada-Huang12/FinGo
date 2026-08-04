-- Allow authenticated users to look up another profile by email for friend requests.
-- Direct SELECT on profiles is blocked by RLS for non-friends, so this SECURITY DEFINER
-- function returns only the fields needed to send a request.

create or replace function public.find_profile_by_email(p_email text)
returns table (
  id uuid,
  email text,
  full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.email, p.full_name
  from public.profiles p
  where lower(p.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.find_profile_by_email(text) from public;
grant execute on function public.find_profile_by_email(text) to authenticated;
grant execute on function public.find_profile_by_email(text) to anon;
