# jsheehan-budget Rewrite

This branch is the source-only rewrite workspace for `sheehan-j/budgeting-app`.

## Status

- The original source repo has been cloned into this working directory.
- The source contract audit lives at `docs/source-audit.md`.
- The backend rewrite target is now centered on:
  - `server/` Express API
  - `shared/` shared contracts and types
- Frontend direction has been corrected: the existing app in `src/` remains the source-of-truth UI, and future work should adapt that frontend instead of replacing it.

## Commands

- `npm install`
- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:seed`

## Notes

- The legacy Vite/Supabase source files in `src/` are not just reference material; they are the intended frontend to preserve and adapt.
- The original source repo does not include Plaid flows or checked-in database migrations.
- The rewrite now includes a Drizzle/Postgres persistence layer under `server/src/db/`.
- `DATABASE_URL` defaults to `postgres://postgres:postgres@127.0.0.1:54329/jsheehan_budget`; override it in `.env` as needed.
- `npm run dev` now serves the preserved root frontend with Vite and the Express API together.
- Auth is now Express cookie-session auth backed by the `app_users` table rather than Supabase Auth.
- Plaid currently has a dashboard status card and backend status endpoint; the actual Link/token flow is still the next implementation step.
