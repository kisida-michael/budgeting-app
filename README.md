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
- Auth is now Clerk-backed: `src/` uses Clerk React with the preserved login UI, and the Express API verifies Clerk bearer tokens while preserving the app's existing `{ user: { id, email } }` session contract.
- Set `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env` before starting the app. The server will also accept `CLERK_PUBLISHABLE_KEY`, but it now falls back to `VITE_CLERK_PUBLISHABLE_KEY` automatically.
- Plaid now has persisted item/account state plus authenticated status, link-token, exchange, sync, and disconnect endpoints; set `PLAID_CLIENT_ID` and `PLAID_SECRET` in `.env` to enable the dashboard flow.
- For production web Link flows, set `PLAID_REDIRECT_URI` to the HTTPS redirect URI registered in Plaid Dashboard. If Plaid rejects a production call, the API now returns the upstream JSON error details instead of an HTML stack trace.
- The Plaid pass maps synced transactions back into the existing transaction table and preserved UI using the synthetic configuration name `Plaid`.
