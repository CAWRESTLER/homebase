# Homebase — Project Tracker

A small, mobile-first tracker for the home renovation. Tasks are grouped by area with checkboxes, priorities, assignees, progress bars, search and filters.

- **Public can view** live progress; **only the owner can edit** (Supabase Row Level Security).
- Without Supabase configured it runs in **browser-only mode** (localStorage) so you can still use it locally.

Stack: React 18 · TypeScript · Vite 6 · lucide-react · plain CSS · Supabase (Postgres + Auth + Realtime) · Vitest.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (validation/import, migration, sorting, seed data)
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ locally
```

With no `.env.local`, the app starts in **local mode**: data is stored in this browser under the
`home-renovation-tasks-v1` key and a banner says so. To work against Supabase locally, copy
`.env.example` to `.env.local` and fill in your project URL and anon key. **Never commit `.env*` files** (they are git-ignored).

## Supabase setup (one time)

1. **Create a project** at <https://supabase.com/dashboard> (free tier is fine).
2. **Run the schema:** Dashboard → SQL Editor → paste and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates `areas`, `tasks`, `editors`, the RLS policies (anyone may `SELECT`; only editors may insert/update/delete),
   the `replace_all` function used by Import/Reset, and adds the tables to the Realtime publication.
3. **Load the tasks:** run [`supabase/seed.sql`](supabase/seed.sql) in the SQL Editor (safe to re-run; it only inserts missing rows).
4. **Add yourself as the owner/editor** (SQL Editor):
   ```sql
   insert into public.editors (email) values ('your-email@example.com');  -- lowercase
   ```
5. **Enable email auth:** Authentication → Sign In / Providers → Email = enabled (magic links are on by default).
6. **Your user is created on first sign-in:** just use **Owner sign in** on the site with the same email.
   The app calls `signInWithOtp` with `shouldCreateUser: true` and `emailRedirectTo: window.location.origin`, so anyone can
   request a magic link and get a (read-only) account — but only emails listed in `editors` can write anything (RLS + `is_editor()`).
   If you'd rather block sign-ups entirely, invite yourself under Authentication → Users and turn off *Allow new users to sign up*.
7. **URL configuration:** Authentication → URL Configuration → set **Site URL** to your Netlify URL
   (e.g. `https://homebase-tracker.netlify.app`) and add it (plus `https://homebase-tracker.netlify.app/**` and `http://localhost:5173` for dev) to **Redirect URLs**. The magic link returns to the site root (`window.location.origin`).
8. Copy **Project URL** and the **anon public key** from Project Settings → API (or *Connect*). The anon key is meant to be public; RLS is what protects writes. Never use the `service_role` key in the frontend.

### How permissions work

| Who | Can |
| --- | --- |
| Anyone (anon) | Read `areas` and `tasks`, receive realtime updates |
| Signed-in user whose email is in `editors` | Insert / update / delete tasks and areas, import, reset |
| Any other signed-in user | Read only |

`public.is_editor()` checks `auth.jwt()->>'email'` against `editors`. The `editors` table can only be changed from the dashboard/SQL editor.

## Deploy to Netlify

1. Push this repo to GitHub, then in Netlify: *Add new site → Import an existing project → GitHub →* `homebase`.
2. Build settings come from [`netlify.toml`](netlify.toml): command `npm run build`, publish `dist`, Node 20, SPA redirect.
3. Site configuration → **Environment variables**:
   - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
4. Deploy (or *Trigger deploy → Clear cache and deploy* after changing env vars — Vite inlines them at build time).
5. Put the final Netlify URL into Supabase Site URL / Redirect URLs (step 7 above).
6. Open the site, tap **Owner sign in**, enter your email, and click the link in the email. Edit controls appear once you're recognized as an editor.

## Using it

- Check a task to complete it (completed tasks move to the bottom of their area, keeping their original order, and show the completion date). Uncheck to restore its place.
- **Edit** (pencil) a task to rename it, change priority (High/Normal/Low), move it to another area, set an assignee, or delete it (with confirmation).
- Rename areas with the pencil next to the area name; add areas at the bottom.
- Filter by All / Open / Complete / High priority, by area, by assignee (or Unassigned), and search by text or person.
- Collapse areas individually or all at once (remembered per browser).

## Storage limitations

- **Local mode:** data lives only in this browser/profile. Clearing site data, private browsing, or switching devices loses it. Nothing syncs to the cloud in this mode.
- **Supabase mode:** Postgres is the source of truth. Edits are applied optimistically and rolled back if the server rejects them. Realtime keeps viewers in sync; the page also refreshes when it regains focus.
- Free Supabase projects pause after a period of inactivity; open the dashboard to resume.
- Import/Reset **overwrite** everything (confirmation required) and run atomically in the database.

## Backups

- Click **Export JSON** (anyone can export) to download `homebase-backup-YYYY-MM-DD.json`. Do this before imports/resets and periodically.
- **Import JSON** (owner/local only) validates the file: unknown priorities become Normal, strings are trimmed, malformed records are skipped, missing/duplicate IDs are regenerated, and nothing is changed until you confirm.
- Supabase also offers database backups (Dashboard → Database → Backups) on paid plans; on the free tier, rely on Export or `pg_dump`.

## Project layout

```
src/
  main.tsx, App.tsx, style.css, types.ts
  components/   Summary, ProgressBar, WorkOrderCard, Toolbar, AddTaskForm, AreaGroup, TaskItem, AddAreaForm, DataTools, SignIn
  data/seed.ts  seed tasks (original list + added cleaning tasks)
  lib/          storage.ts (localStorage + migration), supabase.ts, validate.ts, tasks.ts (sort/filter), useHomebase.ts, id.ts
  __tests__/    vitest unit tests
supabase/migrations/0001_init.sql, supabase/seed.sql   (regenerate seed.sql with `npm run gen:seed-sql`)
netlify.toml, .env.example
```
