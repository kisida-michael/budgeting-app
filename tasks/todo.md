# Budget Rewrite

## Active Plan
- [x] Clone the original source repository into this project root.
- [x] Create a dedicated rewrite branch for the new implementation.
- [x] Audit the source repo contracts and document the required preserved behavior.
- [x] Replace the single-app layout with `client/`, `server/`, and `shared/` workspaces.
- [x] Set up baseline TypeScript and workspace tooling for the new stack.
- [x] Rebuild the persistence layer contracts from the source audit.
- [x] Reuse the existing frontend in `src/` as the source-of-truth UI and stop treating a rebuilt `client/` shell as the target.
- [x] Replace Supabase auth and direct table queries in the existing frontend with the new backend/auth flow.
- [x] Fix post-login popup regressions by deferring hidden dashboard/settings fetches to the components that actually need them.
- [x] Normalize API response shapes still expected in snake_case by the preserved frontend.
- [x] Add Plaid persistence tables and migration support for items, accounts, and sync cursors.
- [x] Implement backend Plaid client and authenticated routes for status, link token creation, public token exchange, sync, and disconnect.
- [x] Map Plaid accounts/transactions into the existing transaction/category model without changing current frontend screens.
- [x] Wire the preserved dashboard Plaid card to Link, connect, sync, and connection-state UX without changing the interface structure.
- [x] Validate the Plaid pass with lint/build plus authenticated API smoke tests for status and guarded connect/sync behavior.

## Review
- Cloned `sheehan-j/budgeting-app` into this project root.
- Created the local branch `rewrite/source-only-rebuild`.
- Documented the current-source contracts in `docs/source-audit.md`, including the absence of Plaid and checked-in schema migrations.
- Added workspace scaffolding for the new rewrite runtime in `client/`, `server/`, and `shared/`.
- Added root TypeScript, ESLint, build, and dev orchestration plus a shared API contract package.
- Verified `npm run lint`, `npm run typecheck`, and `npm run build`.
- Smoke-tested the new Express server with `curl http://localhost:4000/health` and `curl http://localhost:4000/api/meta`.
- Added Drizzle schema inference for `transactions`, `budgets`, `categories`, `configurations`, `merchants`, `uploads`, and `whitelist`.
- Generated the initial migration at `server/drizzle/0000_busy_zuras.sql`.
- Added migration and seed commands plus starter category seed data for clean database setup.
- Built a separate `client/` shell to mirror the original app visually, but that is now superseded by the corrected plan to keep the exact existing frontend in `src/`.
- Verified `npm run db:generate`, `curl http://localhost:4000/api/meta`, and `curl http://localhost:4000/api/db/health`.
- Connected the default `DATABASE_URL` to the running Docker Postgres instance on `127.0.0.1:54329`, created `jsheehan_budget`, ran migrations, and seeded categories.
- Added backend cookie-session auth and database-backed workspace routes for transactions, configurations, categories, budgets, merchants, uploads, and whitelist checks.
- Replaced the old Supabase transport in the preserved `src/` frontend with API-backed auth/query helpers while keeping the same screens and UI structure.
- Added an additive Plaid connection card to the existing dashboard and a backend Plaid status endpoint as the first connection surface.
- Verified `npm run db:migrate`, `npm run db:seed`, `npm run build`, signup via `POST /api/auth/signup`, authenticated `GET /api/auth/session`, authenticated `GET /api/categories`, authenticated `GET /api/transactions/count`, and `GET /api/plaid/status`.
- Deferred configuration and merchant fetches so the hidden dashboard upload modal no longer triggers settings-side requests right after login.
- Moved merchant and upload fetching responsibility back into the preserved settings/upload components and normalized upload timestamps back to the frontend's expected `created_at` shape.
- Verified `npm run lint`, `npm run build`, authenticated `GET /api/configurations`, authenticated `GET /api/merchants`, and authenticated `GET /api/uploads`.
- Added persisted Plaid item/account state plus Plaid identifiers on synced transactions, and generated `server/drizzle/0002_glamorous_beast.sql`.
- Added authenticated Plaid routes for status, link token creation, public token exchange, sync, and disconnect, with config-aware `503` guards when Plaid secrets are not set.
- Wired the preserved dashboard Plaid card to `react-plaid-link`, connection status, manual sync, disconnect, and data refresh back into the existing dashboard/budget stores.
- Documented Plaid env setup in `.env.example` and `README.md`.
- Verified `npm run typecheck`, `npm run lint`, `npm run build`, `npm run db:generate`, `npm run db:migrate`, authenticated `GET /api/plaid/status`, and guarded `POST /api/plaid/link-token` returning `503` without Plaid credentials.
