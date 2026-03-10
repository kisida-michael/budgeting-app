import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const transactionSignMeaning = pgEnum("transaction_sign_meaning", ["charge", "credit"]);
export const merchantMatchType = pgEnum("merchant_match_type", ["contains", "equals"]);

export const categories = pgTable(
  "categories",
  {
    name: varchar("name", { length: 80 }).primaryKey(),
    orderIndex: integer("order_index").notNull(),
    color: text("color").notNull(),
    colorDark: text("color_dark").notNull(),
    colorLight: text("color_light").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    orderIndexUnique: uniqueIndex("categories_order_index_unique").on(table.orderIndex)
  })
);

export const whitelist = pgTable("whitelist", {
  email: varchar("email", { length: 320 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    emailUnique: uniqueIndex("app_users_email_unique").on(table.email)
  })
);

export const plaidItems = pgTable("plaid_items", {
  itemId: varchar("item_id", { length: 128 }).primaryKey(),
  userId: text("user_id").notNull(),
  accessToken: text("access_token").notNull(),
  institutionId: varchar("institution_id", { length: 128 }),
  institutionName: text("institution_name"),
  lastCursor: text("last_cursor"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const plaidAccounts = pgTable("plaid_accounts", {
  accountId: varchar("account_id", { length: 128 }).primaryKey(),
  itemId: varchar("item_id", { length: 128 })
    .references(() => plaidItems.itemId, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  officialName: text("official_name"),
  mask: varchar("mask", { length: 32 }),
  type: varchar("type", { length: 64 }).notNull(),
  subtype: varchar("subtype", { length: 64 }),
  availableBalance: numeric("available_balance", { precision: 12, scale: 2 }),
  currentBalance: numeric("current_balance", { precision: 12, scale: 2 }),
  isoCurrencyCode: varchar("iso_currency_code", { length: 8 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const configurations = pgTable(
  "configurations",
  {
    userId: text("user_id").notNull(),
    name: varchar("name", { length: 25 }).notNull(),
    minusSymbolMeaning: transactionSignMeaning("minus_symbol_meaning"),
    plusSymbolMeaning: transactionSignMeaning("plus_symbol_meaning"),
    noSymbolMeaning: transactionSignMeaning("no_symbol_meaning"),
    dateColNum: integer("date_col_num").notNull(),
    amountColNum: integer("amount_col_num").notNull(),
    merchantColNum: integer("merchant_col_num").notNull(),
    hasHeader: boolean("has_header").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.name], name: "configurations_pk" })
  })
);

export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey(),
  userId: text("user_id").notNull(),
  files: text("files").notNull(),
  transactionsUploaded: integer("transactions_uploaded").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const budgets = pgTable(
  "budgets",
  {
    userId: text("user_id").notNull(),
    categoryName: varchar("category_name", { length: 80 })
      .references(() => categories.name, { onDelete: "cascade" })
      .notNull(),
    limit: numeric("limit", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.categoryName], name: "budgets_pk" })
  })
);

export const budgetPeriods = pgTable(
  "budget_periods",
  {
    userId: text("user_id").notNull(),
    categoryName: varchar("category_name", { length: 80 })
      .references(() => categories.name, { onDelete: "cascade" })
      .notNull(),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    limit: numeric("limit", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.userId, table.categoryName, table.month, table.year],
      name: "budget_periods_pk"
    })
  })
);

export const merchants = pgTable(
  "merchants",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: text("user_id").notNull(),
    text: varchar("text", { length: 60 }).notNull(),
    type: merchantMatchType("type").notNull(),
    categoryName: varchar("category_name", { length: 80 })
      .references(() => categories.name, { onDelete: "restrict" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    uniqueMerchantRule: uniqueIndex("merchants_user_text_type_unique").on(table.userId, table.text, table.type)
  })
);

export const transactions = pgTable("transactions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: text("user_id").notNull(),
  configurationName: varchar("configuration_name", { length: 25 }).notNull(),
  categoryName: varchar("category_name", { length: 80 })
    .references(() => categories.name, { onDelete: "restrict" })
    .notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  day: integer("day").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  merchant: text("merchant").notNull(),
  ignored: boolean("ignored").default(false).notNull(),
  uploadId: uuid("upload_id").references(() => uploads.id, { onDelete: "cascade" }),
  plaidAccountId: varchar("plaid_account_id", { length: 128 }).references(() => plaidAccounts.accountId, {
    onDelete: "cascade"
  }),
  plaidTransactionId: varchar("plaid_transaction_id", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
},
  (table) => ({
    userPlaidTransactionIdUnique: uniqueIndex("transactions_user_plaid_transaction_id_unique").on(
      table.userId,
      table.plaidTransactionId
    )
  })
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type PlaidItem = typeof plaidItems.$inferSelect;
export type PlaidAccount = typeof plaidAccounts.$inferSelect;
