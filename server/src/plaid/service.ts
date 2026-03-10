import { and, desc, eq, inArray, sql } from "drizzle-orm";
import axios from "axios";
import { db } from "../db/client.js";
import { merchants, plaidAccounts, plaidItems, transactions } from "../db/schema.js";
import { getPlaidClient, plaidCountryCodes, plaidProducts } from "./client.js";
import { env } from "../env.js";

const PLAID_CONFIGURATION_NAME = "Plaid";
const DEFAULT_CATEGORY = "Uncategorized";
const CREDIT_CATEGORY = "Credits/Payments";
const INCOME_CATEGORY = "Income";

type MerchantRule = {
  text: string;
  type: "contains" | "equals";
  categoryName: string;
};

type PlaidTransactionRecord = {
  transaction_id: string;
  pending_transaction_id?: string | null;
  account_id: string;
  name: string;
  merchant_name?: string | null;
  authorized_date?: string | null;
  date?: string | null;
  amount: number;
  pending?: boolean | null;
  personal_finance_category?: {
    primary?: string | null;
    detailed?: string | null;
  } | null;
};

function getDateParts(dateValue: string) {
  const parsed = new Date(dateValue);
  return {
    day: parsed.getUTCDate(),
    month: parsed.getUTCMonth() + 1,
    year: parsed.getUTCFullYear()
  };
}

function categorizePlaidTransaction(transaction: PlaidTransactionRecord, merchantRules: MerchantRule[]) {
  const merchantName = (transaction.merchant_name ?? transaction.name ?? "").trim();
  const merchantNameLower = merchantName.toLowerCase();

  for (const rule of merchantRules) {
    const ruleText = rule.text.toLowerCase();
    if (rule.type === "contains" && merchantNameLower.includes(ruleText)) {
      return rule.categoryName;
    }
    if (rule.type === "equals" && merchantNameLower === ruleText) {
      return rule.categoryName;
    }
  }

  const payrollKeywords = ["payroll", "direct deposit", "salary", "direct dep"];
  if (payrollKeywords.some((keyword) => merchantNameLower.includes(keyword)) || /\bach\b/i.test(merchantName)) {
    return INCOME_CATEGORY;
  }

  const primary = transaction.personal_finance_category?.primary ?? "";
  const detailed = transaction.personal_finance_category?.detailed ?? "";

  if (transaction.amount < 0) {
    return primary.startsWith("INCOME") ? INCOME_CATEGORY : CREDIT_CATEGORY;
  }

  if (primary === "FOOD_AND_DRINK") {
    return detailed.includes("GROCER") ? "Groceries" : "Dining";
  }
  if (primary === "GENERAL_MERCHANDISE") {
    return "Shopping";
  }
  if (primary === "TRANSPORTATION") {
    return "Transportation";
  }
  if (primary === "TRAVEL") {
    return "Travel";
  }
  if (primary === "ENTERTAINMENT") {
    return "Entertainment";
  }
  if (primary === "MEDICAL") {
    return "Health";
  }
  if (primary === "RENT_AND_UTILITIES") {
    return detailed.includes("RENT") ? "Housing" : "Bills & Utilities";
  }
  if (primary === "INCOME") {
    return INCOME_CATEGORY;
  }
  if (primary.startsWith("TRANSFER") || primary === "LOAN_PAYMENTS" || primary === "BANK_FEES") {
    return CREDIT_CATEGORY;
  }

  return DEFAULT_CATEGORY;
}

async function getMerchantRules(userId: string): Promise<MerchantRule[]> {
  const rows = await db.query.merchants.findMany({
    where: eq(merchants.userId, userId)
  });

  return rows.map((row) => ({
    text: row.text,
    type: row.type,
    categoryName: row.categoryName
  }));
}

async function refreshPlaidAccounts(userId: string, itemId: string, accessToken: string) {
  const client = getPlaidClient();
  const accountsResponse = await client.accountsGet({
    access_token: accessToken
  });

  const accounts = accountsResponse.data.accounts;
  if (accounts.length > 0) {
    await db
      .insert(plaidAccounts)
      .values(
        accounts.map((account) => ({
          accountId: account.account_id,
          itemId,
          userId,
          name: account.name,
          officialName: account.official_name ?? null,
          mask: account.mask ?? null,
          type: account.type,
          subtype: account.subtype ?? null,
          availableBalance:
            account.balances.available == null ? null : String(Number(account.balances.available)),
          currentBalance:
            account.balances.current == null ? null : String(Number(account.balances.current)),
          isoCurrencyCode: account.balances.iso_currency_code ?? null
        }))
      )
      .onConflictDoUpdate({
        target: plaidAccounts.accountId,
        set: {
          itemId,
          userId,
          name: sql`excluded.name`,
          officialName: sql`excluded.official_name`,
          mask: sql`excluded.mask`,
          type: sql`excluded.type`,
          subtype: sql`excluded.subtype`,
          availableBalance: sql`excluded.available_balance`,
          currentBalance: sql`excluded.current_balance`,
          isoCurrencyCode: sql`excluded.iso_currency_code`,
          updatedAt: new Date()
        }
      });
  }
}

async function upsertPlaidTransactions(userId: string, transactionRows: PlaidTransactionRecord[]) {
  if (transactionRows.length === 0) {
    return { added: 0, modified: 0, removedPending: 0 };
  }

  const merchantRules = await getMerchantRules(userId);
  let removedPending = 0;

  const rows = transactionRows
    .filter((transaction) => !transaction.pending)
    .map((transaction) => {
      const dateValue = transaction.authorized_date ?? transaction.date;
      if (!dateValue) {
        return null;
      }

      return {
        userId,
        configurationName: PLAID_CONFIGURATION_NAME,
        categoryName: categorizePlaidTransaction(transaction, merchantRules),
        amount: String(Number(transaction.amount)),
        date: dateValue,
        ...getDateParts(dateValue),
        merchant: (transaction.merchant_name ?? transaction.name).trim(),
        ignored: false,
        uploadId: null,
        plaidAccountId: transaction.account_id,
        plaidTransactionId: transaction.transaction_id
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  for (const transaction of transactionRows) {
    if (transaction.pending_transaction_id) {
      const result = await db
        .delete(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.plaidTransactionId, transaction.pending_transaction_id)
          )
        )
        .returning({ id: transactions.id });
      removedPending += result.length;
    }
  }

  if (rows.length > 0) {
    await db
      .insert(transactions)
      .values(rows)
      .onConflictDoUpdate({
        target: [transactions.userId, transactions.plaidTransactionId],
        set: {
          configurationName: PLAID_CONFIGURATION_NAME,
          categoryName: sql`excluded.category_name`,
          amount: sql`excluded.amount`,
          date: sql`excluded.date`,
          day: sql`excluded.day`,
          month: sql`excluded.month`,
          year: sql`excluded.year`,
          merchant: sql`excluded.merchant`,
          plaidAccountId: sql`excluded.plaid_account_id`,
          updatedAt: new Date()
        }
      });
  }

  return { added: rows.length, modified: rows.length, removedPending };
}

export async function getPlaidStatus(userId: string) {
  const [items, accounts] = await Promise.all([
    db.query.plaidItems.findMany({
      where: eq(plaidItems.userId, userId),
      orderBy: [desc(plaidItems.createdAt)]
    }),
    db.query.plaidAccounts.findMany({
      where: eq(plaidAccounts.userId, userId)
    })
  ]);

  const accountsByItemId = new Map<string, number>();
  for (const account of accounts) {
    accountsByItemId.set(account.itemId, (accountsByItemId.get(account.itemId) ?? 0) + 1);
  }

  const lastSyncAt = items.reduce<string | null>((latest, item) => {
    const value = item.lastSyncAt?.toISOString() ?? null;
    if (!value) return latest;
    return !latest || value > latest ? value : latest;
  }, null);

  return {
    connectedItems: items.length,
    connectedAccounts: accounts.length,
    lastSyncAt,
    items: items.map((item) => ({
      itemId: item.itemId,
      institutionName: item.institutionName ?? item.institutionId ?? "Connected bank",
      accountCount: accountsByItemId.get(item.itemId) ?? 0,
      lastSyncAt: item.lastSyncAt?.toISOString() ?? null
    }))
  };
}

export async function createPlaidLinkToken(userId: string) {
  const client = getPlaidClient();
  const linkTokenRequest: Parameters<typeof client.linkTokenCreate>[0] = {
    user: {
      client_user_id: userId
    },
    client_name: "Budget",
    products: plaidProducts,
    country_codes: plaidCountryCodes,
    language: "en"
  };

  if (env.PLAID_REDIRECT_URI) {
    linkTokenRequest.redirect_uri = env.PLAID_REDIRECT_URI;
  }

  const response = await client.linkTokenCreate(linkTokenRequest);

  return {
    linkToken: response.data.link_token,
    expiration: response.data.expiration
  };
}

export function getPlaidErrorDetails(error: unknown) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 502;
    const data = error.response?.data as Record<string, unknown> | undefined;
    const requestId = typeof data?.request_id === "string" ? data.request_id : undefined;
    const errorCode = typeof data?.error_code === "string" ? data.error_code : undefined;
    const errorType = typeof data?.error_type === "string" ? data.error_type : undefined;
    const errorMessage =
      typeof data?.error_message === "string"
        ? data.error_message
        : error.message || "Plaid request failed.";

    return {
      status,
      body: {
        error: errorMessage,
        plaid: {
          requestId,
          errorCode,
          errorType
        }
      }
    };
  }

  return {
    status: 502,
    body: {
      error: error instanceof Error ? error.message : "Plaid request failed."
    }
  };
}

export async function exchangePlaidPublicToken(input: {
  userId: string;
  publicToken: string;
  institutionId?: string | null;
  institutionName?: string | null;
}) {
  const client = getPlaidClient();
  const exchangeResponse = await client.itemPublicTokenExchange({
    public_token: input.publicToken
  });

  await db
    .insert(plaidItems)
    .values({
      itemId: exchangeResponse.data.item_id,
      userId: input.userId,
      accessToken: exchangeResponse.data.access_token,
      institutionId: input.institutionId ?? null,
      institutionName: input.institutionName ?? null
    })
    .onConflictDoUpdate({
      target: plaidItems.itemId,
      set: {
        userId: input.userId,
        accessToken: exchangeResponse.data.access_token,
        institutionId: input.institutionId ?? null,
        institutionName: input.institutionName ?? null,
        updatedAt: new Date()
      }
    });

  await refreshPlaidAccounts(input.userId, exchangeResponse.data.item_id, exchangeResponse.data.access_token);
  const syncResult = await syncPlaidItemTransactions(input.userId, exchangeResponse.data.item_id);

  return syncResult;
}

export async function syncPlaidItemTransactions(userId: string, itemId: string) {
  const client = getPlaidClient();
  const item = await db.query.plaidItems.findFirst({
    where: and(eq(plaidItems.userId, userId), eq(plaidItems.itemId, itemId))
  });

  if (!item) {
    throw new Error("Plaid item not found.");
  }

  await refreshPlaidAccounts(userId, item.itemId, item.accessToken);

  let cursor = item.lastCursor ?? undefined;
  let hasMore = true;
  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;

  while (hasMore) {
    const syncResponse = await client.transactionsSync({
      access_token: item.accessToken,
      cursor,
      options: {
        include_personal_finance_category: true
      }
    });

    const { added, modified, removed, has_more, next_cursor } = syncResponse.data;

    const addedResult = await upsertPlaidTransactions(userId, added as PlaidTransactionRecord[]);
    const modifiedResult = await upsertPlaidTransactions(userId, modified as PlaidTransactionRecord[]);
    const removedIds = removed.map((entry) => entry.transaction_id);

    if (removedIds.length > 0) {
      const deleted = await db
        .delete(transactions)
        .where(and(eq(transactions.userId, userId), inArray(transactions.plaidTransactionId, removedIds)))
        .returning({ id: transactions.id });
      removedCount += deleted.length;
    }

    addedCount += addedResult.added;
    modifiedCount += modifiedResult.modified;
    cursor = next_cursor;
    hasMore = has_more;
  }

  await db
    .update(plaidItems)
    .set({
      lastCursor: cursor ?? null,
      lastSyncAt: new Date(),
      updatedAt: new Date()
    })
    .where(and(eq(plaidItems.userId, userId), eq(plaidItems.itemId, itemId)));

  return {
    itemId,
    added: addedCount,
    modified: modifiedCount,
    removed: removedCount
  };
}

export async function syncAllPlaidItems(userId: string) {
  const items = await db.query.plaidItems.findMany({
    where: eq(plaidItems.userId, userId)
  });

  const results = [];
  let added = 0;
  let modified = 0;
  let removed = 0;

  for (const item of items) {
    const result = await syncPlaidItemTransactions(userId, item.itemId);
    results.push(result);
    added += result.added;
    modified += result.modified;
    removed += result.removed;
  }

  return {
    items: results,
    added,
    modified,
    removed
  };
}

export async function disconnectPlaidItem(userId: string, itemId: string) {
  const item = await db.query.plaidItems.findFirst({
    where: and(eq(plaidItems.userId, userId), eq(plaidItems.itemId, itemId))
  });

  if (!item) {
    throw new Error("Plaid item not found.");
  }

  const client = getPlaidClient();
  await client.itemRemove({
    access_token: item.accessToken
  });

  await db.delete(plaidItems).where(and(eq(plaidItems.userId, userId), eq(plaidItems.itemId, itemId)));

  return { ok: true };
}
