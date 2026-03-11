# Lessons

- When the user says to keep the same exact frontend, do not rebuild or replace the UI shell; preserve the existing `src/` app and only change auth, queries, and additive flows like Plaid.
- In the preserved frontend, do not prefetch settings-only data from hidden mounted components; fetch it when the relevant screen or modal actually opens.
- When Clerk is split across a Vite frontend and separate Express API origins, use `getToken()` + `Authorization: Bearer` on API requests instead of trying to preserve cookie-session auth semantics.
- When Clerk is used in a split frontend/backend workspace, let the Express server fall back to `VITE_CLERK_PUBLISHABLE_KEY` if `CLERK_PUBLISHABLE_KEY` is not set, otherwise middleware bootstrap can fail even though the frontend is configured.
- For custom Clerk email/password flows in this package version, `@clerk/react` exposes signal-based hooks by default; use `@clerk/react/legacy` for the object API methods like `prepareEmailAddressVerification()` and `attemptEmailAddressVerification()`.
- In the current Clerk v6 custom signup flow, mount `<div id="clerk-captcha" />` on the preserved signup screen before calling the sign-up API, or bot protection can break account creation with confusing 4xx responses.
- For Clerk v6 custom signup with the signal-based API, complete email-code signup with `signUp.password()`, `signUp.verifications.sendEmailCode()`, `signUp.verifications.verifyEmailCode()`, and `signUp.finalize()` so verification finishes into a real active account.
- For Plaid production web Link, support an optional `PLAID_REDIRECT_URI` and return Plaid's upstream JSON error payload from the API; otherwise production config failures collapse into opaque HTML Axios stack traces.
- In dark mode, category chips cannot reuse light-theme accent text treatment; keep chip text explicitly high-contrast and apply the same theme-aware chip helper across Budgets, Transactions, and Settings.
