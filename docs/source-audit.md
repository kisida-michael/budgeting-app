# Source Audit

## Summary

This repository is the original source application. It is a Vite React SPA that talks directly to Supabase from the browser. There is no backend server in this repo, no Plaid integration, and no checked-in SQL migrations or schema files beyond Supabase local config.

That means the rewrite must preserve the source app's real contract:

- Supabase email/password auth
- optional signup gated by a `whitelist` table lookup
- CSV-based transaction import
- category and merchant-rule budgeting workflows
- direct persistence into Supabase tables

If the target rewrite is expected to include Plaid, that is a product change relative to the source repo, not a parity requirement derived from this codebase.

## Runtime Architecture

- Client: React 18 + Vite SPA
- Routing: `react-router-dom`
- State: Zustand
- Persistence/auth: direct `@supabase/supabase-js` client calls from the browser
- Environments:
  - production tables: `transactions`, `budgets`, `uploads`
  - dev tables: `transactions_dev`, `budgets_dev`, `uploads_dev`

## Auth Contract

Source of truth:

- [src/App.jsx](/Users/michaelkisida/budget/jsheehan-budget/src/App.jsx)
- [src/screens/Login.jsx](/Users/michaelkisida/budget/jsheehan-budget/src/screens/Login.jsx)
- [src/util/userUtil.js](/Users/michaelkisida/budget/jsheehan-budget/src/util/userUtil.js)

Observed behavior:

- App access is gated by `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange(...)`.
- Unauthenticated users are routed to the login screen.
- Login is email/password via Supabase Auth.
- Signup is email/password via Supabase Auth.
- Signup is blocked unless the email exists in the `whitelist` table.
- The current UI assumes `session.user.id` is the stable user identifier used for writes.
- User isolation is not implemented in client queries; the source app appears to rely on Supabase RLS or per-user table policies.

## Data Contracts

### `transactions` / `transactions_dev`

Source of truth:

- [src/util/supabaseQueries.js](/Users/michaelkisida/budget/jsheehan-budget/src/util/supabaseQueries.js)
- [src/util/transactionUtil.js](/Users/michaelkisida/budget/jsheehan-budget/src/util/transactionUtil.js)

Observed fields used by the app:

- `id`
- `userId`
- `configurationName`
- `categoryName`
- `amount`
- `date`
- `day`
- `month`
- `year`
- `merchant`
- `ignored`
- `uploadId`

Behavior:

- Transactions are inserted in bulk from parsed CSV files.
- Transactions are fetched as full rows and formatted client-side.
- Transaction sorting defaults to date descending, then merchant ascending.
- Duplicate detection is based on `merchant + amount + date + configurationName`.
- Single-row actions:
  - recategorize
  - ignore/un-ignore
  - delete
- Bulk actions:
  - recategorize selected
  - ignore/un-ignore selected
  - delete selected
- Deleting an upload is expected to cascade-delete its transactions.

### `configurations`

Source of truth:

- [src/components/ConfigurationCreator.jsx](/Users/michaelkisida/budget/jsheehan-budget/src/components/ConfigurationCreator.jsx)

Observed fields:

- `name`
- `minusSymbolMeaning`
- `plusSymbolMeaning`
- `noSymbolMeaning`
- `dateColNum`
- `amountColNum`
- `merchantColNum`
- `hasHeader`
- `userId`

Behavior:

- A configuration defines how to parse a CSV file.
- Validation rules:
  - `name` is required and max length 25
  - date, amount, merchant column numbers are required numeric values
  - exactly two of the three sign modes are configured
  - exactly one configured sign maps to `credit`
  - exactly one configured sign maps to `charge`

### `categories`

Source of truth:

- [src/util/supabaseQueries.js](/Users/michaelkisida/budget/jsheehan-budget/src/util/supabaseQueries.js)
- [src/constants/Categories.js](/Users/michaelkisida/budget/jsheehan-budget/src/constants/Categories.js)

Observed fields:

- `name`
- `orderIndex`
- `color`
- `colorDark`
- `colorLight`

Behavior:

- Categories are globally ordered by `orderIndex`.
- Two categories are special:
  - `Income`
  - `Credits/Payments`
- Both are ignored in primary spending and budget totals.
- Non-editable budget rows:
  - `Total`
  - `Credits/Payments`
  - `Income`

### `budgets` / `budgets_dev`

Source of truth:

- [src/util/supabaseQueries.js](/Users/michaelkisida/budget/jsheehan-budget/src/util/supabaseQueries.js)
- [src/screens/Budgets.jsx](/Users/michaelkisida/budget/jsheehan-budget/src/screens/Budgets.jsx)

Observed fields:

- `categoryName`
- `limit`
- `userId`

Behavior:

- Budgets are loaded by selecting `categories` with nested `budgets(*)`.
- A month-specific budget view is computed by combining category limits with transaction spending for the selected month.
- `Total` is a synthetic row, not a stored category budget.
- Empty limits are removed by deleting the matching budget row for that user/category.

### `merchants`

Source of truth:

- [src/util/supabaseQueries.js](/Users/michaelkisida/budget/jsheehan-budget/src/util/supabaseQueries.js)
- [src/components/MerchantSettings.jsx](/Users/michaelkisida/budget/jsheehan-budget/src/components/MerchantSettings.jsx)

Observed fields:

- `id`
- `text`
- `type`
- `categoryName`
- `userId`

Observed relation:

- `category:categories(*)`

Behavior:

- Merchant rules map merchant text to a category.
- Match types:
  - `contains`
  - `equals`
- Duplicate merchant rules are rejected for the same `text + type`.
- "Apply to Existing Transactions" re-runs merchant categorization over all current transactions and upserts the full transaction set.

### `uploads` / `uploads_dev`

Source of truth:

- [src/util/supabaseQueries.js](/Users/michaelkisida/budget/jsheehan-budget/src/util/supabaseQueries.js)
- [src/components/UploadModal.jsx](/Users/michaelkisida/budget/jsheehan-budget/src/components/UploadModal.jsx)

Observed fields:

- `id`
- `userId`
- `files`
- `transactionsUploaded`
- `created_at`

Behavior:

- Each upload gets a UUID.
- `files` is stored as a newline-delimited string with `filename (configuration)` entries.
- Deleting an upload is expected to cascade-delete child transactions.

### `whitelist`

Source of truth:

- [src/util/userUtil.js](/Users/michaelkisida/budget/jsheehan-budget/src/util/userUtil.js)

Observed fields:

- `email`

Behavior:

- Signup is allowed only when exactly one row matches the email.

## Domain Rules

### CSV import rules

Source of truth:

- [src/util/transactionUtil.js](/Users/michaelkisida/budget/jsheehan-budget/src/util/transactionUtil.js)

Behavior:

- CSV rows are split with quote-aware comma parsing.
- If `hasHeader` is true, the first row is skipped.
- Imported transactions start as `Uncategorized`.
- Payroll-like merchants are auto-classified as `Income`.
  - substring match: `payroll`, `direct deposit`, `salary`, `direct dep`
  - regex match: `ach`
- Credit-style transactions default to `Credits/Payments` unless already marked `Income`.
- Amounts are parsed into decimal numbers rounded to cents.
- A temporary `tempInsertId` is used only for client duplicate resolution and should not be persisted.

### Spending and dashboard rules

Source of truth:

- [src/util/statsUtil.js](/Users/michaelkisida/budget/jsheehan-budget/src/util/statsUtil.js)

Behavior:

- Ignored transactions do not count toward spending.
- `Income` and `Credits/Payments` are excluded from normal spending totals.
- Category filters on `Income` or `Credits/Payments` trigger special-case summary behavior.
- Annual spending is computed month-by-month from transaction rows, not from a materialized rollup table.

### Filtering contract

Source of truth:

- [src/util/filterUtil.js](/Users/michaelkisida/budget/jsheehan-budget/src/util/filterUtil.js)

Supported filters:

- date range
- merchant contains
- category exact match
- configuration exact match
- amount less than / equals / greater than

## Missing Source Artifacts

These are not present in the original repository:

- database migrations
- explicit SQL schema
- Plaid flows
- bank account or item models
- server-side HTTP API

The rewrite can still proceed, but schema reconstruction must be inferred from the client query layer unless more source material exists outside this repository.
