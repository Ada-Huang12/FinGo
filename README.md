# FinGo

Friendly financial habit tracker — budgets, bills, goals, social savings, and an AI coach.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- React Router
- Recharts
- Supabase Auth + Postgres (with Row Level Security)

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

Without Supabase credentials the app runs in **local demo mode**: auth and data persist in `localStorage` per browser. Sign up to get personalized seeded demo data for your account.

## Supabase setup (multi-user)

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy:
   - **Project URL**
   - **anon / public** key  
   Do **not** put the `service_role` secret in the frontend.
3. Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

4. In the Supabase SQL Editor, run the migrations in order:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_avatar_shop.sql`

That creates tables, profile auto-creation on signup, contribution sync triggers, avatar/points fields, and RLS policies so users only see their own financial data (plus explicitly shared goals / friends).

5. Restart `npm run dev`.

### Auth notes

- Enable **Email** provider in Authentication → Providers.
- For local development you can disable “Confirm email” under Authentication → Providers → Email so sign-up logs in immediately.

## Deploy to Vercel

FinGo is a static Vite SPA. `vercel.json` rewrites all routes to `index.html` so deep links like `/bills` work.

### Checklist

1. **Push the repo** to GitHub/GitLab/Bitbucket.
2. In [Vercel](https://vercel.com): **Add New Project** → import the FinGo repo.
3. Confirm build settings (Vercel usually detects Vite):
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variables (Project → Settings → Environment Variables):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

   Apply them to Production (and Preview if you want). Redeploy after saving.
5. In Supabase → **Authentication → URL Configuration**:
   - **Site URL:** `https://YOUR_VERCEL_DOMAIN.vercel.app`
   - **Redirect URLs:** add `https://YOUR_VERCEL_DOMAIN.vercel.app/**`
6. Confirm both SQL migrations have been run in the Supabase SQL Editor.
7. Open the Vercel URL, sign up, and verify data persists after logout/login.

### Without Supabase env vars

The deployed site still loads in **local demo mode** (browser `localStorage`). Useful for UI demos; not multi-user or cross-device.

## Features

| Area | What works |
|------|------------|
| Home | Income vs spending chart, budgets, categories, AI tip, add transaction, **receipt scan + CSV import** |
| Bills | Calendar, upcoming/overdue/paid, subscription toggles, coach reminders |
| Goals | Create goals, progress bars, contributions, invite friends |
| Social | Friends, requests, shared goals, contributions, challenges |
| AI Coach | Interactive chat with personalized tips from your data |
| Auth | Email/password sign-up, login, logout, persistent sessions |

## Project structure

```
src/
  components/   # UI, layout, charts, feature widgets
  contexts/     # Auth + data providers (Supabase or local)
  lib/          # types, supabase client, local store, AI tips
  pages/        # route screens
supabase/
  migrations/   # SQL schema + RLS
```

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run preview` — preview production build
