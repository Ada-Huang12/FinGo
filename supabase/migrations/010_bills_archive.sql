-- Soft-archive bills so long lists can be decluttered without deleting history.
alter table public.bills
  add column if not exists archived boolean not null default false;

create index if not exists idx_bills_user_archived on public.bills (user_id, archived, due_date);
