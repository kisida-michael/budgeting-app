# Lessons

- When the user says to keep the same exact frontend, do not rebuild or replace the UI shell; preserve the existing `src/` app and only change auth, queries, and additive flows like Plaid.
- In the preserved frontend, do not prefetch settings-only data from hidden mounted components; fetch it when the relevant screen or modal actually opens.
- When Clerk is split across a Vite frontend and separate Express API origins, use `getToken()` + `Authorization: Bearer` on API requests instead of trying to preserve cookie-session auth semantics.
- When Clerk is used in a split frontend/backend workspace, let the Express server fall back to `VITE_CLERK_PUBLISHABLE_KEY` if `CLERK_PUBLISHABLE_KEY` is not set, otherwise middleware bootstrap can fail even though the frontend is configured.
