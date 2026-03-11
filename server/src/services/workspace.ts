import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  budgetPeriods,
  budgets,
  categories,
  configurations,
  merchants,
  transactions,
  uploads
} from "../db/schema.js";

const ignoredCategoryNames = ["Income", "Credits/Payments"];
const specialCaseCategories = ["Income", "Credits/Payments"];

type TransactionRow = typeof transactions.$inferSelect;
type MerchantRuleRow = typeof merchants.$inferSelect;
type ConfigurationRow = typeof configurations.$inferSelect;
type MerchantRuleLike = Pick<MerchantRuleRow, "id" | "text" | "type" | "categoryName">;

type FilterCategory = {
  name: string;
  color?: string;
  colorDark?: string;
  colorLight?: string;
};

type DateFilter = {
  type: "Date";
  start: { month: number; day: number; year: number };
  end: { month: number; day: number; year: number };
};

type MerchantFilter = {
  type: "Merchant";
  merchant: string;
};

type CategoryFilter = {
  type: "Category";
  category: FilterCategory;
};

type ConfigurationFilter = {
  type: "Configuration";
  configuration: string;
};

type AmountFilter = {
  type: "Amount";
  amount: string | number;
  condition: "lessThan" | "greaterThan" | "equals";
};

type SearchFilter = {
  type: "Search";
  query: string;
};

type ClientFilter =
  | DateFilter
  | MerchantFilter
  | CategoryFilter
  | ConfigurationFilter
  | AmountFilter
  | SearchFilter;

export type TransactionView = {
  id?: number;
  userId: string;
  configurationName: string;
  categoryName: string;
  amount: number;
  date: string;
  sqlDate?: string;
  day: number;
  month: number;
  year: number;
  merchant: string;
  ignored: boolean;
  uploadId: string | null;
  tempInsertId?: string;
  include?: boolean;
};

type UploadPreviewFile = {
  name: string;
  configurationName: string;
  content: string;
};

function toSqlDateFromDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toUiDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US");
}

export function serializeTransaction(row: TransactionRow): TransactionView {
  return {
    id: row.id,
    userId: row.userId,
    configurationName: row.configurationName,
    categoryName: row.categoryName,
    amount: Number(row.amount),
    date: row.date,
    day: row.day,
    month: row.month,
    year: row.year,
    merchant: row.merchant,
    ignored: row.ignored,
    uploadId: row.uploadId
  };
}

export function validateConfigurationPayload(payload: Record<string, unknown>) {
  const errors: string[] = [];

  const name = String(payload.name ?? "").trim();
  if (name.length === 0) {
    errors.push("Configuration name cannot be empty.");
  } else if (name.length > 25) {
    errors.push("Configuration name cannot be longer than 25 characters.");
  }

  const dateColNum = Number(payload.dateColNum);
  if (payload.dateColNum === null || payload.dateColNum === undefined || payload.dateColNum === "") {
    errors.push("Date column number cannot be empty.");
  } else if (Number.isNaN(dateColNum)) {
    errors.push("Date column number must be a number.");
  }

  const amountColNum = Number(payload.amountColNum);
  if (payload.amountColNum === null || payload.amountColNum === undefined || payload.amountColNum === "") {
    errors.push("Amount column number cannot be empty.");
  } else if (Number.isNaN(amountColNum)) {
    errors.push("Amount column number must be a number.");
  }

  const merchantColNum = Number(payload.merchantColNum);
  if (payload.merchantColNum === null || payload.merchantColNum === undefined || payload.merchantColNum === "") {
    errors.push("Merchant column number cannot be empty.");
  } else if (Number.isNaN(merchantColNum)) {
    errors.push("Merchant column number must be a number.");
  }

  const selectedSymbolOptions = [
    payload.minusSymbolMeaning,
    payload.plusSymbolMeaning,
    payload.noSymbolMeaning
  ].filter(Boolean);

  if (selectedSymbolOptions.length !== 2) {
    errors.push("Exactly two checkboxes should be selected signifying transactions minus/plus/no symbols.");
  } else {
    const credits = selectedSymbolOptions.filter((value) => value === "credit").length;
    const charges = selectedSymbolOptions.filter((value) => value === "charge").length;

    if (credits !== 1) {
      errors.push("Exactly one checkbox should be selected for credit transactions.");
    }

    if (charges !== 1) {
      errors.push("Exactly one checkbox should be selected for charge transactions.");
    }
  }

  return errors;
}

async function getOrderedCategories() {
  return await db.query.categories.findMany({
    orderBy: [asc(categories.orderIndex)]
  });
}

async function getUserTransactions(userId: string) {
  const rows = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    orderBy: [asc(transactions.date), asc(transactions.merchant)]
  });

  return rows.map(serializeTransaction);
}

async function getUserTransactionsForMonth(userId: string, month: number, year: number) {
  const rows = await db.query.transactions.findMany({
    where: and(eq(transactions.userId, userId), eq(transactions.month, month), eq(transactions.year, year)),
    orderBy: [asc(transactions.date), asc(transactions.merchant)]
  });

  return rows.map(serializeTransaction);
}

async function getUserTransactionsForYear(userId: string, year: number) {
  const rows = await db.query.transactions.findMany({
    where: and(eq(transactions.userId, userId), eq(transactions.year, year)),
    orderBy: [asc(transactions.date), asc(transactions.merchant)]
  });

  return rows.map(serializeTransaction);
}

async function getMerchantRules(userId: string) {
  return await db.query.merchants.findMany({
    where: eq(merchants.userId, userId),
    orderBy: [asc(merchants.id)]
  });
}

function getCategoricalSpending(transactionRows: TransactionView[]) {
  const categoricalSpending: Record<string, number> = {};

  transactionRows.forEach((transaction) => {
    if (transaction.ignored) return;

    if (categoricalSpending[transaction.categoryName]) {
      categoricalSpending[transaction.categoryName] += transaction.amount;
    } else {
      categoricalSpending[transaction.categoryName] = transaction.amount;
    }
  });

  return categoricalSpending;
}

function handleSpecialCaseCategoryFilter(
  transactionRows: TransactionView[],
  filters: ClientFilter[]
) {
  const categoryFilters = filters.filter((filter) => filter.type === "Category");
  if (categoryFilters.length === 1 && specialCaseCategories.includes(categoryFilters[0].category?.name)) {
    const categoricalSpending = getCategoricalSpending(transactionRows);
    const categoryName = categoryFilters[0].category.name;

    let amount = 0;
    if (categoryName === "Income") {
      amount = "Income" in categoricalSpending ? categoricalSpending.Income * -1 : 0;
    } else if (categoryName === "Credits/Payments") {
      amount = "Credits/Payments" in categoricalSpending ? categoricalSpending["Credits/Payments"] : 0;
    }

    return {
      spending: { amount },
      topCategories: [
        {
          ...categoryFilters[0].category,
          amount,
          percentage: 100
        }
      ],
      specialCaseCategory: true,
      category: categoryFilters[0].category,
      filters
    };
  }

  return null;
}

function filterTransactions(transactionRows: TransactionView[], filters: ClientFilter[]) {
  const filterTypes = ["Date", "Merchant", "Category", "Configuration", "Amount", "Search"] as const;
  let filteredTransactions = [...transactionRows];

  filterTypes.forEach((filterType) => {
    const matchingFilters = filters.filter((filter) => filter.type === filterType);

    if (matchingFilters.length > 0) {
      const matchingTransactions: TransactionView[] = [];

      matchingFilters.forEach((filter) => {
        filteredTransactions.forEach((transaction) => {
          let isMatchingTransaction = false;

          if (filter.type === "Date") {
            const transactionDate = new Date(transaction.date);
            const startDate = new Date(`${filter.start.month}/${filter.start.day}/${filter.start.year}`);
            const endDate = new Date(`${filter.end.month}/${filter.end.day}/${filter.end.year}`);
            isMatchingTransaction = transactionDate >= startDate && transactionDate <= endDate;
          } else if (filter.type === "Merchant") {
            isMatchingTransaction = transaction.merchant
              .toLowerCase()
              .includes(String(filter.merchant ?? "").toLowerCase());
          } else if (filter.type === "Category") {
            isMatchingTransaction = transaction.categoryName === filter.category?.name;
          } else if (filter.type === "Configuration") {
            isMatchingTransaction = transaction.configurationName === filter.configuration;
          } else if (filter.type === "Amount") {
            const transactionAmount = Number(transaction.amount);
            const filterAmount = Number(filter.amount);
            isMatchingTransaction =
              (filter.condition === "lessThan" && transactionAmount < filterAmount) ||
              (filter.condition === "greaterThan" && transactionAmount > filterAmount) ||
              (filter.condition === "equals" && transactionAmount === filterAmount);
          } else if (filter.type === "Search") {
            const query = filter.query.toLowerCase().trim();
            const searchableText = [
              transaction.merchant,
              transaction.categoryName,
              transaction.configurationName,
              transaction.date,
              String(transaction.amount)
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            isMatchingTransaction = query.length === 0 || searchableText.includes(query);
          }

          if (
            isMatchingTransaction &&
            !matchingTransactions.some((existingTransaction) => existingTransaction.id === transaction.id)
          ) {
            matchingTransactions.push(transaction);
          }
        });
      });

      filteredTransactions = [...matchingTransactions];
    }
  });

  return filteredTransactions;
}

export async function buildDashboardStats(userId: string, filters: ClientFilter[]) {
  const normalizedFilters = Array.isArray(filters) ? filters : [];
  const [transactionRows, categoryRows] = await Promise.all([
    getUserTransactions(userId),
    getOrderedCategories()
  ]);

  const filteredTransactions = filterTransactions(transactionRows, normalizedFilters);
  const specialCase = handleSpecialCaseCategoryFilter(filteredTransactions, normalizedFilters);
  if (specialCase) {
    return specialCase;
  }

  const spendingAmount = filteredTransactions.reduce((acc, transaction) => {
    if (!ignoredCategoryNames.includes(transaction.categoryName) && !transaction.ignored) {
      return acc + transaction.amount;
    }

    return acc;
  }, 0);

  const categoricalSpending = getCategoricalSpending(filteredTransactions);
  ignoredCategoryNames.forEach((categoryName) => {
    delete categoricalSpending[categoryName];
  });

  const sortedCategories = Object.entries(categoricalSpending)
    .sort((a, b) => b[1] - a[1])
    .map(([categoryName, amount]) => {
      const category = categoryRows.find((entry) => entry.name === categoryName);

      return {
        name: categoryName,
        amount,
        color: category?.color ?? "#E2E8F0",
        colorDark: category?.colorDark ?? "#94A3B8",
        colorLight: category?.colorLight ?? "#F8FAFC",
        percentage: spendingAmount === 0 ? 0 : (amount / spendingAmount) * 100
      };
    });

  return {
    spending: {
      amount: spendingAmount,
      title: `${new Date().toLocaleString("default", { month: "long" })} Spending`
    },
    categories: sortedCategories,
    specialCaseCategory: false,
    filters: normalizedFilters
  };
}

export async function buildSpendingBreakdown(userId: string, year: number) {
  const transactionRows = await getUserTransactionsForYear(userId, year);
  const spending: Record<string, number>[] = [];
  const yearTotals: Record<string, number> = { Total: 0 };

  for (let month = 1; month <= 12; month += 1) {
    const monthTransactions = transactionRows.filter((transaction) => transaction.month === month);
    const categoricalSpending = getCategoricalSpending(monthTransactions);

    let total = 0;
    Object.keys(categoricalSpending).forEach((categoryName) => {
      if (!ignoredCategoryNames.includes(categoryName)) {
        total += categoricalSpending[categoryName];
      }

      if (!(categoryName in yearTotals)) {
        yearTotals[categoryName] = 0;
      }

      yearTotals[categoryName] += categoricalSpending[categoryName];
    });

    categoricalSpending.Total = total;
    yearTotals.Total += total;
    if ("Income" in categoricalSpending) {
      categoricalSpending.Income *= -1;
    }

    spending[month - 1] = categoricalSpending;
  }

  if ("Income" in yearTotals) {
    yearTotals.Income *= -1;
  }

  spending[12] = yearTotals;
  return spending;
}

export async function buildBudgets(userId: string, month: number, year: number) {
  const [categoryRows, templateBudgetRows, periodBudgetRows, transactionRows] = await Promise.all([
    getOrderedCategories(),
    db.query.budgets.findMany({ where: eq(budgets.userId, userId) }),
    db.query.budgetPeriods.findMany({
      where: and(eq(budgetPeriods.userId, userId), eq(budgetPeriods.month, month), eq(budgetPeriods.year, year))
    }),
    getUserTransactionsForMonth(userId, month, year)
  ]);

  const templateBudgetMap = new Map(
    templateBudgetRows.map((budgetRow) => [budgetRow.categoryName, Number(budgetRow.limit)])
  );
  const periodBudgetMap = new Map(
    periodBudgetRows.map((budgetRow) => [budgetRow.categoryName, Number(budgetRow.limit)])
  );
  const categoricalSpending = getCategoricalSpending(transactionRows);
  const now = new Date();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const daysInMonth = new Date(year, month, 0).getDate();
  const targetMonthIndex = year * 12 + (month - 1);
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();
  const isPastMonth = targetMonthIndex < currentMonthIndex;
  const isFutureMonth = targetMonthIndex > currentMonthIndex;
  const daysElapsed = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : isPastMonth ? daysInMonth : 0;
  const daysRemaining = isCurrentMonth ? Math.max(daysInMonth - now.getDate(), 0) : isFutureMonth ? daysInMonth : 0;
  let totalLimit = 0;
  let totalSpending = 0;
  let totalRemaining = 0;
  let totalForecast = 0;
  let totalSafeToSpend = 0;

  const budgetViews = categoryRows.map((category) => {
    const limit = periodBudgetMap.get(category.name) ?? templateBudgetMap.get(category.name) ?? null;
    const spending = categoricalSpending[category.name] ?? 0;
    const percentage = limit ? (spending / limit) * 100 : null;
    const remaining = limit === null ? null : limit - spending;
    const forecast =
      ignoredCategoryNames.includes(category.name) || daysElapsed === 0
        ? null
        : Math.round(((spending / daysElapsed) * daysInMonth + Number.EPSILON) * 100) / 100;
    const safeToSpend =
      ignoredCategoryNames.includes(category.name) || limit === null || daysRemaining <= 0
        ? null
        : Math.round(((limit - spending) / Math.max(daysRemaining, 1) + Number.EPSILON) * 100) / 100;

    if (!ignoredCategoryNames.includes(category.name)) {
      if (limit) {
        totalLimit += limit;
      }

      totalSpending += spending;
      totalRemaining += remaining ?? 0;
      if (forecast !== null) {
        totalForecast += forecast;
      }
      if (safeToSpend !== null) {
        totalSafeToSpend += safeToSpend;
      }
    }

    return {
      ...category,
      limit,
      spending,
      percentage,
      remaining,
      forecast,
      safeToSpend,
      isPeriodSpecific: periodBudgetMap.has(category.name)
    };
  });

  const totalBudget = {
    name: "Total",
    orderIndex: -1,
    color: "#D9F99D",
    colorDark: "#65A30D",
    colorLight: "#ECFCCB",
    limit: totalLimit > 0 ? totalLimit : null,
    spending: totalSpending,
    percentage: totalLimit > 0 ? (totalSpending / totalLimit) * 100 : null,
    remaining: totalLimit > 0 ? totalRemaining : null,
    forecast: daysElapsed > 0 ? totalForecast : null,
    safeToSpend: daysRemaining > 0 ? totalSafeToSpend : null,
    isPeriodSpecific: periodBudgetRows.length > 0,
    budgetContext: {
      month,
      year,
      isCurrentMonth,
      daysInMonth,
      daysElapsed,
      daysRemaining
    }
  };

  return [totalBudget, ...budgetViews];
}

export async function copyBudgetsFromPreviousPeriod(userId: string, month: number, year: number) {
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;

  const [previousPeriodRows, templateBudgetRows] = await Promise.all([
    db.query.budgetPeriods.findMany({
      where: and(
        eq(budgetPeriods.userId, userId),
        eq(budgetPeriods.month, previousMonth),
        eq(budgetPeriods.year, previousYear)
      )
    }),
    db.query.budgets.findMany({
      where: eq(budgets.userId, userId)
    })
  ]);

  const sourceRows = previousPeriodRows.length > 0 ? previousPeriodRows : templateBudgetRows;

  await db
    .delete(budgetPeriods)
    .where(and(eq(budgetPeriods.userId, userId), eq(budgetPeriods.month, month), eq(budgetPeriods.year, year)));

  if (sourceRows.length > 0) {
    await db.insert(budgetPeriods).values(
      sourceRows.map((row) => ({
        userId,
        categoryName: row.categoryName,
        month,
        year,
        limit: String(Number(row.limit))
      }))
    );
  }

  return {
    copiedCount: sourceRows.length,
    source: previousPeriodRows.length > 0 ? "previous-period" : "default-template",
    previousMonth,
    previousYear
  };
}

export function findMatchingMerchantRule<T extends MerchantRuleLike>(
  merchantText: string,
  merchantRules: T[]
): T | null {
  let matchedRule: T | null = null;

  merchantRules.forEach((merchantRule) => {
    if (merchantRule.type === "contains" && merchantText.includes(merchantRule.text)) {
      matchedRule = merchantRule;
    } else if (merchantRule.type === "equals" && merchantText === merchantRule.text) {
      matchedRule = merchantRule;
    }
  });

  return matchedRule;
}

function applyMerchantRules(
  transactionRows: TransactionView[],
  merchantRules: MerchantRuleRow[]
) {
  return transactionRows.map((transaction) => {
    const updated = { ...transaction };
    const matchedRule = findMatchingMerchantRule(updated.merchant, merchantRules);
    if (matchedRule) {
      updated.categoryName = matchedRule.categoryName;
    }

    return updated;
  });
}

function parseCsvTransactions(
  fileContent: string,
  configuration: ConfigurationRow,
  userId: string,
  uploadId: string
) {
  const parsedTransactions: TransactionView[] = [];
  const rows = fileContent.split("\n");

  if (rows[rows.length - 1] === "") {
    rows.pop();
  }

  if (configuration.hasHeader) {
    rows.shift();
  }

  rows.forEach((rawRow) => {
    const row = rawRow.replace(", ", ",");
    const cells = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    const newTransaction: TransactionView = {
      userId,
      configurationName: configuration.name,
      categoryName: "Uncategorized",
      tempInsertId: crypto.randomUUID(),
      uploadId,
      amount: 0,
      date: "",
      day: 0,
      month: 0,
      year: 0,
      merchant: "",
      ignored: false
    };

    cells.forEach((rawCell, index) => {
      let cell = rawCell;
      if (cell[0] === '"' && cell[cell.length - 1] === '"') {
        cell = cell.substring(1, cell.length - 1);
      }

      cell = cell.trim();

      if (index + 1 === configuration.amountColNum) {
        if (cell.includes("$")) {
          cell = cell.replace("$", "");
        }

        cell = cell.replace(/,/g, "");

        let coefficient = 1;
        if (cell.includes("-")) {
          if (!configuration.minusSymbolMeaning) {
            throw new Error("Encountered unexpected minus symbol in amount column. Please check your configuration.");
          }

          cell = cell.replace("-", "");
          coefficient = configuration.minusSymbolMeaning === "charge" ? 1 : -1;
        } else if (cell.includes("+")) {
          if (!configuration.plusSymbolMeaning) {
            throw new Error("Encountered unexpected plus symbol in amount column. Please check your configuration.");
          }

          cell = cell.replace("+", "");
          coefficient = configuration.plusSymbolMeaning === "charge" ? 1 : -1;
        } else if (configuration.noSymbolMeaning) {
          coefficient = configuration.noSymbolMeaning === "charge" ? 1 : -1;
        }

        if (coefficient < 0 && newTransaction.categoryName !== "Income") {
          newTransaction.categoryName = "Credits/Payments";
        }

        newTransaction.amount = Math.round((parseFloat(cell) * coefficient + Number.EPSILON) * 100) / 100;
      } else if (index + 1 === configuration.dateColNum) {
        const date = new Date(cell);
        newTransaction.date = toUiDate(date);
        newTransaction.sqlDate = toSqlDateFromDate(date);
        newTransaction.month = date.getMonth() + 1;
        newTransaction.year = date.getFullYear();
        newTransaction.day = date.getDate();
      } else if (index + 1 === configuration.merchantColNum) {
        newTransaction.merchant = cell;

        const merchantLower = cell.toLowerCase();
        const payrollKeywords = ["payroll", "direct deposit", "salary", "direct dep"];
        if (payrollKeywords.some((keyword) => merchantLower.includes(keyword))) {
          newTransaction.categoryName = "Income";
        }

        const payrollRegexes = [/\bach\b/gi];
        if (payrollRegexes.some((regex) => regex.test(cell))) {
          newTransaction.categoryName = "Income";
        }
      }
    });

    parsedTransactions.push(newTransaction);
  });

  return parsedTransactions;
}

function buildFilesLabel(files: UploadPreviewFile[]) {
  return files.map((file) => `${file.name} (${file.configurationName})`).join("\n");
}

export async function previewTransactionsImport(userId: string, uploadId: string, files: UploadPreviewFile[]) {
  const configurationNames = [...new Set(files.map((file) => file.configurationName))];
  const [configurationRows, merchantRules, existingTransactions] = await Promise.all([
    db.query.configurations.findMany({
      where:
        configurationNames.length > 0
          ? and(eq(configurations.userId, userId), inArray(configurations.name, configurationNames))
          : eq(configurations.userId, userId)
    }),
    getMerchantRules(userId),
    getUserTransactions(userId)
  ]);

  const configurationMap = new Map(configurationRows.map((configuration) => [configuration.name, configuration]));
  const missingConfigurations = configurationNames.filter((name) => !configurationMap.has(name));
  if (missingConfigurations.length > 0) {
    throw new Error(`Missing configuration(s): ${missingConfigurations.join(", ")}`);
  }

  let parsedTransactions = files.flatMap((file) =>
    parseCsvTransactions(file.content, configurationMap.get(file.configurationName)!, userId, uploadId)
  );

  parsedTransactions = applyMerchantRules(parsedTransactions, merchantRules);

  const duplicateTransactions: TransactionView[] = [];
  const pendingTransactions: TransactionView[] = [];

  parsedTransactions.forEach((transaction) => {
    const isDuplicate = existingTransactions.some(
      (existingTransaction) =>
        existingTransaction.merchant === transaction.merchant &&
        existingTransaction.amount === transaction.amount &&
        toUiDate(existingTransaction.date) === transaction.date &&
        existingTransaction.configurationName === transaction.configurationName
    );

    if (isDuplicate) {
      duplicateTransactions.push({ ...transaction, include: false });
    } else {
      pendingTransactions.push(transaction);
    }
  });

  return {
    uploadId,
    filesLabel: buildFilesLabel(files),
    pendingTransactions,
    duplicateTransactions
  };
}

export async function commitTransactionsImport(
  userId: string,
  uploadId: string,
  filesLabel: string,
  transactionRows: Record<string, unknown>[]
) {
  const insertRows = transactionRows.map((transaction) => {
    const sqlDate = String(transaction.sqlDate ?? transaction.date ?? "");
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(sqlDate) ? new Date(`${sqlDate}T00:00:00`) : new Date(sqlDate);

    return {
      userId,
      configurationName: String(transaction.configurationName),
      categoryName: String(transaction.categoryName),
      amount: String(Number(transaction.amount)),
      date: /^\d{4}-\d{2}-\d{2}$/.test(sqlDate) ? sqlDate : toSqlDateFromDate(parsedDate),
      day: Number(transaction.day ?? parsedDate.getDate()),
      month: Number(transaction.month ?? parsedDate.getMonth() + 1),
      year: Number(transaction.year ?? parsedDate.getFullYear()),
      merchant: String(transaction.merchant),
      ignored: Boolean(transaction.ignored),
      uploadId
    };
  });

  await db.transaction(async (tx) => {
    await tx.insert(uploads).values({
      id: uploadId,
      userId,
      files: filesLabel,
      transactionsUploaded: insertRows.length
    });

    if (insertRows.length > 0) {
      await tx.insert(transactions).values(insertRows);
    }
  });

  return { insertedCount: insertRows.length };
}

export async function applyMerchantRulesToExistingTransactions(userId: string) {
  const [merchantRules, transactionRows] = await Promise.all([
    getMerchantRules(userId),
    db.query.transactions.findMany({
      where: eq(transactions.userId, userId),
      orderBy: [asc(transactions.id)]
    })
  ]);

  const updates = transactionRows
    .map((transaction) => {
      let categoryName = transaction.categoryName;
      const matchedRule = findMatchingMerchantRule(transaction.merchant, merchantRules);
      if (matchedRule) {
        categoryName = matchedRule.categoryName;
      }

      if (categoryName === transaction.categoryName) {
        return null;
      }

      return db
        .update(transactions)
        .set({ categoryName, updatedAt: new Date() })
        .where(and(eq(transactions.userId, userId), eq(transactions.id, transaction.id)));
    })
    .filter(Boolean);

  await Promise.all(updates);
  return { updatedCount: updates.length };
}
