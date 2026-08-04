-- Optional: after creating a real user via the app, you can insert demo rows
-- Replace USER_UUID with auth.users.id from the dashboard.
-- Prefer letting the app create data through the UI for true multi-user testing.

-- Example (run only for development):
-- insert into public.budgets (user_id, category, limit_amount, spent_amount, month)
-- values
--   ('USER_UUID', 'Food', 450, 120, to_char(now(), 'YYYY-MM')),
--   ('USER_UUID', 'Transport', 180, 40, to_char(now(), 'YYYY-MM'));
