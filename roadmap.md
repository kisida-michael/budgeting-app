# Frontend Roadmap

## Goals
- Improve the day-to-day transaction workflow without replacing the preserved UI structure.
- Add more visibility into budgeting, sync health, and account state.
- Keep new frontend features aligned with the current server-first architecture.
- Avoid accidental Plaid cost increases.

## Product Constraints
- Plaid account and cached balance visibility is acceptable.
  Use existing account data from `/accounts/get` style sync paths already persisted in the app.
- Do not add real-time balance refresh via Plaid Balance unless explicitly approved.
  That would add Balance product billing.
- Keep secrets and provider credentials out of the frontend.
- Preserve the existing navigation and overall interaction model unless a later phase explicitly changes it.

## Phase 1: Core UX Upgrades
Priority: highest

- Transaction search
  Add a fast unified search for merchant, category, configuration, amount, and date text.
- Saved views
  Add reusable presets such as `This Month`, `Uncategorized`, `Bills`, `Large Charges`, and `Recent Credits`.
- Dashboard needs-attention panel
  Surface uncategorized transactions, over-budget categories, failed Plaid syncs, and uploads that need review.
- Dark mode
  Add a theme toggle, tokenized colors, and persistent theme preference without changing layout structure.
- Better empty/loading/error states
  Replace blank areas and generic failures with explicit UI states and recovery actions.
- Undo-friendly notifications
  Support reversible actions for delete, ignore, and recategorize where practical.

## Phase 2: Budgeting and Account Visibility
Priority: high

- Budget copy-forward
  Copy the previous month’s budget into the current month.
- Remaining budget and safe-to-spend
  Show remaining category budget and a monthly/daily safe-to-spend indicator.
- Forecasted month-end spend
  Project end-of-month spend from current pace.
- Plaid account visibility
  Show connected accounts, masks, account types, cached balances, and sync health.
- Plaid sync diagnostics
  Show last successful sync, last attempted sync, and actionable failure states.
- Dashboard trend context
  Add trend indicators for current month vs prior month.

## Phase 3: Settings and Admin UX
Priority: high

- Category management
  Add create, rename, reorder, archive, and color management for categories.
- Merchant rule testing
  Add a sandbox input to preview how a merchant string will categorize.
- Configuration test panel
  Allow sample CSV preview against a selected import configuration before upload.
- Profile and account settings
  Add a home for user-level settings such as theme and future integration preferences.
- Upload safety tools
  Expand uploads with better diagnostics and destructive-action guardrails.

## Phase 4: Transaction Power Features
Priority: medium

- Inline transaction detail drawer
  Show source, merchant, category, upload/Plaid origin, and edit actions.
- Bulk recategorize with rule creation
  Prompt to save merchant rules after repeated recategorizations.
- Drilldown flows
  Click a dashboard card, spending cell, or budget row to jump into filtered transactions.
- Merchant/category breakdowns
  Add secondary analysis views inside spending and budgeting screens.
- Recurring merchant detection
  Identify likely subscriptions and recurring expenses.

## Phase 5: Advanced Finance Features
Priority: medium

- Split transactions
  Support splitting a single transaction across multiple categories.
- Budget rollover
  Allow selected categories to carry over monthly surplus/deficit.
- Budget templates
  Save and apply reusable budget setups.
- Activity feed / audit history
  Track imports, Plaid syncs, recategorizations, and budget changes.
- Data export
  Export transactions, budgets, and derived summaries.

## Recommended Build Order
1. Dark mode
2. Transaction search
3. Saved views
4. Dashboard needs-attention panel
5. Plaid account visibility with cached balances only
6. Budget copy-forward
7. Safe-to-spend and forecast
8. Category management in Settings
9. Merchant rule testing
10. Drilldown and inline detail flows

## First Implementation Wave
- Add theme tokens and dark mode persistence.
- Add unified transaction search in the dashboard table.
- Add saved views backed by the existing filter model.
- Add a compact needs-attention panel on the dashboard.
- Add cached Plaid account details to the existing Plaid card.

## Deferred / Explicitly Not Included Yet
- Real-time balance refresh using Plaid Balance
- Multi-tenant billing/admin features
- Major navigation redesign
- Mobile-first redesign
