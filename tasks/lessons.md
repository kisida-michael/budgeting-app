# Lessons

- When the user says to keep the same exact frontend, do not rebuild or replace the UI shell; preserve the existing `src/` app and only change auth, queries, and additive flows like Plaid.
- In the preserved frontend, do not prefetch settings-only data from hidden mounted components; fetch it when the relevant screen or modal actually opens.
