import { Router } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
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
import { requireSession } from "../auth/session.js";
import {
  applyMerchantRulesToExistingTransactions,
  buildBudgets,
  buildDashboardStats,
  buildSpendingBreakdown,
  commitTransactionsImport,
  copyBudgetsFromPreviousPeriod,
  serializeTransaction,
  previewTransactionsImport,
  validateConfigurationPayload
} from "../services/workspace.js";

const router = Router();
const protectedCategoryNames = new Set(["Income", "Credits/Payments", "Uncategorized"]);
const categoryColorPresets = [
  { color: "rgb(220 252 231)", colorDark: "rgb(22 163 74)", colorLight: "rgb(240 253 244)" },
  { color: "rgb(219 234 254)", colorDark: "rgb(37 99 235)", colorLight: "rgb(239 246 255)" },
  { color: "rgb(254 240 138)", colorDark: "rgb(202 138 4)", colorLight: "rgb(254 249 195)" },
  { color: "rgb(233 213 255)", colorDark: "rgb(147 51 234)", colorLight: "rgb(250 245 255)" },
  { color: "rgb(254 215 170)", colorDark: "rgb(234 88 12)", colorLight: "rgb(255 237 213)" },
  { color: "rgb(251 207 232)", colorDark: "rgb(219 39 119)", colorLight: "rgb(253 242 248)" },
  { color: "rgb(191 219 254)", colorDark: "rgb(29 78 216)", colorLight: "rgb(239 246 255)" },
  { color: "rgb(187 247 208)", colorDark: "rgb(21 128 61)", colorLight: "rgb(240 253 244)" }
];

router.use(requireSession);

function toSqlDate(input: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const parsed = new Date(input);
  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeCategoryName(value: unknown) {
  return String(value ?? "").trim();
}

function getCategoryPreset(orderIndex: number) {
  return categoryColorPresets[((orderIndex % categoryColorPresets.length) + categoryColorPresets.length) % categoryColorPresets.length];
}

router.get("/transactions", async (req, res) => {
  const rows = await db.query.transactions.findMany({
    where: eq(transactions.userId, req.authUser!.id),
    orderBy: [desc(transactions.date), asc(transactions.merchant)]
  });

  res.json(rows.map(serializeTransaction));
});

router.get("/transactions/count", async (req, res) => {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(eq(transactions.userId, req.authUser!.id));

  res.json({ count: row?.count ?? 0 });
});

router.get("/transactions/month", async (req, res) => {
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  const rows = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, req.authUser!.id),
      eq(transactions.month, month),
      eq(transactions.year, year)
    ),
    orderBy: [desc(transactions.date), asc(transactions.merchant)]
  });

  res.json(rows.map(serializeTransaction));
});

router.post("/dashboard/stats", async (req, res) => {
  const stats = await buildDashboardStats(req.authUser!.id, Array.isArray(req.body?.filters) ? req.body.filters : []);
  res.json(stats);
});

router.get("/spending", async (req, res) => {
  const year = Number(req.query.year);
  res.json(await buildSpendingBreakdown(req.authUser!.id, year));
});

router.get("/budgets", async (req, res) => {
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  res.json(await buildBudgets(req.authUser!.id, month, year));
});

router.post("/transactions/import", async (req, res) => {
  const payload = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
  if (payload.length === 0) {
    res.json({ ok: true });
    return;
  }

  await db.insert(transactions).values(
    payload.map((item: Record<string, unknown>) => {
      const dateValue = toSqlDate(String(item.date));
      const parsed = new Date(dateValue);
      return {
        userId: req.authUser!.id,
        configurationName: String(item.configurationName),
        categoryName: String(item.categoryName),
        amount: String(Number(item.amount)),
        date: dateValue,
        day: Number(item.day ?? parsed.getDate()),
        month: Number(item.month ?? parsed.getMonth() + 1),
        year: Number(item.year ?? parsed.getFullYear()),
        merchant: String(item.merchant),
        ignored: Boolean(item.ignored),
        uploadId: item.uploadId ? String(item.uploadId) : null
      };
    })
  );

  res.json({ ok: true });
});

router.patch("/transactions/:id/ignored", async (req, res) => {
  await db
    .update(transactions)
    .set({ ignored: Boolean(req.body?.ignored), updatedAt: new Date() })
    .where(and(eq(transactions.id, Number(req.params.id)), eq(transactions.userId, req.authUser!.id)));
  res.json({ ok: true });
});

router.patch("/transactions/:id/category", async (req, res) => {
  await db
    .update(transactions)
    .set({ categoryName: String(req.body?.categoryName), updatedAt: new Date() })
    .where(and(eq(transactions.id, Number(req.params.id)), eq(transactions.userId, req.authUser!.id)));
  res.json({ ok: true });
});

router.patch("/transactions/bulk/ignored", async (req, res) => {
  const ids = (req.body?.ids ?? []).map(Number);
  if (ids.length > 0) {
    await db
      .update(transactions)
      .set({ ignored: Boolean(req.body?.ignored), updatedAt: new Date() })
      .where(and(eq(transactions.userId, req.authUser!.id), inArray(transactions.id, ids)));
  }
  res.json({ ok: true });
});

router.patch("/transactions/bulk/category", async (req, res) => {
  const ids = (req.body?.ids ?? []).map(Number);
  if (ids.length > 0) {
    await db
      .update(transactions)
      .set({ categoryName: String(req.body?.categoryName), updatedAt: new Date() })
      .where(and(eq(transactions.userId, req.authUser!.id), inArray(transactions.id, ids)));
  }
  res.json({ ok: true });
});

router.put("/transactions", async (req, res) => {
  const payload = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
  await Promise.all(
    payload.map((transactionPatch: Record<string, unknown>) =>
      db
        .update(transactions)
        .set({
          categoryName: String(transactionPatch.categoryName),
          ignored: Boolean(transactionPatch.ignored),
          updatedAt: new Date()
        })
        .where(
          and(eq(transactions.id, Number(transactionPatch.id)), eq(transactions.userId, req.authUser!.id))
        )
    )
  );

  res.json({ ok: true });
});

router.delete("/transactions/:id", async (req, res) => {
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, Number(req.params.id)), eq(transactions.userId, req.authUser!.id)));
  res.json({ ok: true });
});

router.post("/transactions/bulk-delete", async (req, res) => {
  const ids = (req.body?.ids ?? []).map(Number);
  if (ids.length > 0) {
    await db
      .delete(transactions)
      .where(and(eq(transactions.userId, req.authUser!.id), inArray(transactions.id, ids)));
  }
  res.json({ ok: true });
});

router.get("/configurations", async (req, res) => {
  const rows = await db.query.configurations.findMany({
    where: eq(configurations.userId, req.authUser!.id),
    orderBy: [asc(configurations.name)]
  });
  res.json(rows);
});

router.post("/configurations", async (req, res) => {
  const payload = req.body?.configuration;
  const errors = validateConfigurationPayload(payload ?? {});
  if (errors.length > 0) {
    res.status(400).json({ error: errors[0], errors });
    return;
  }

  await db
    .insert(configurations)
    .values({
      userId: req.authUser!.id,
      name: String(payload.name),
      minusSymbolMeaning: payload.minusSymbolMeaning ?? null,
      plusSymbolMeaning: payload.plusSymbolMeaning ?? null,
      noSymbolMeaning: payload.noSymbolMeaning ?? null,
      dateColNum: Number(payload.dateColNum),
      amountColNum: Number(payload.amountColNum),
      merchantColNum: Number(payload.merchantColNum),
      hasHeader: Boolean(payload.hasHeader)
    })
    .onConflictDoUpdate({
      target: [configurations.userId, configurations.name],
      set: {
        minusSymbolMeaning: payload.minusSymbolMeaning ?? null,
        plusSymbolMeaning: payload.plusSymbolMeaning ?? null,
        noSymbolMeaning: payload.noSymbolMeaning ?? null,
        dateColNum: Number(payload.dateColNum),
        amountColNum: Number(payload.amountColNum),
        merchantColNum: Number(payload.merchantColNum),
        hasHeader: Boolean(payload.hasHeader),
        updatedAt: new Date()
      }
    });

  res.json({ ok: true });
});

router.delete("/configurations/:name", async (req, res) => {
  await db
    .delete(configurations)
    .where(and(eq(configurations.userId, req.authUser!.id), eq(configurations.name, req.params.name)));
  res.json({ ok: true });
});

router.get("/categories", async (_req, res) => {
  const rows = await db.query.categories.findMany({
    orderBy: [asc(categories.orderIndex)]
  });
  res.json(rows);
});

router.post("/categories", async (_req, res) => {
  const name = normalizeCategoryName(_req.body?.name);
  if (!name) {
    res.status(400).json({ error: "Category name cannot be empty." });
    return;
  }

  if (name.length > 80) {
    res.status(400).json({ error: "Category name cannot be longer than 80 characters." });
    return;
  }

  const existing = await db.query.categories.findFirst({
    where: eq(categories.name, name)
  });
  if (existing) {
    res.status(409).json({ error: "Category already exists." });
    return;
  }

  const orderedCategories = await db.query.categories.findMany({
    orderBy: [desc(categories.orderIndex)]
  });
  const nextOrderIndex = orderedCategories[0] ? orderedCategories[0].orderIndex + 1 : 0;
  const preset = getCategoryPreset(nextOrderIndex);

  await db.insert(categories).values({
    name,
    orderIndex: nextOrderIndex,
    ...preset
  });

  res.json({ ok: true });
});

router.patch("/categories/reorder", async (req, res) => {
  const orderedNames: string[] = Array.isArray(req.body?.orderedNames)
    ? req.body.orderedNames.map((name: unknown) => String(name))
    : [];

  const categoryRows = await db.query.categories.findMany({
    orderBy: [asc(categories.orderIndex)]
  });
  const activeCategories = categoryRows.filter((category) => category.archivedAt === null);
  const archivedCategories = categoryRows.filter((category) => category.archivedAt !== null);

  if (
    orderedNames.length !== activeCategories.length ||
    orderedNames.some((name) => !activeCategories.some((category) => category.name === name))
  ) {
    res.status(400).json({ error: "orderedNames must contain every active category exactly once." });
    return;
  }

  const reorderedCategories = [
    ...orderedNames
      .map((name: string) => activeCategories.find((category) => category.name === name))
      .filter((category): category is (typeof activeCategories)[number] => Boolean(category)),
    ...archivedCategories
  ];

  await db.transaction(async (tx) => {
    await Promise.all(
      reorderedCategories.map((category, index) =>
        tx
          .update(categories)
          .set({ orderIndex: 1000 + index })
          .where(eq(categories.name, category.name))
      )
    );

    await Promise.all(
      reorderedCategories.map((category, index) =>
        tx
          .update(categories)
          .set({ orderIndex: index })
          .where(eq(categories.name, category.name))
      )
    );
  });

  res.json({ ok: true });
});

router.patch("/categories/:name", async (req, res) => {
  const currentName = decodeURIComponent(req.params.name);
  const nextName = normalizeCategoryName(req.body?.nextName);
  const hasRename = nextName.length > 0 && nextName !== currentName;
  const archived =
    typeof req.body?.archived === "boolean" ? Boolean(req.body.archived) : null;

  const existingCategory = await db.query.categories.findFirst({
    where: eq(categories.name, currentName)
  });

  if (!existingCategory) {
    res.status(404).json({ error: "Category not found." });
    return;
  }

  if (protectedCategoryNames.has(currentName) && (hasRename || archived === true)) {
    res.status(400).json({ error: "This category is protected and cannot be renamed or archived." });
    return;
  }

  if (hasRename && nextName.length > 80) {
    res.status(400).json({ error: "Category name cannot be longer than 80 characters." });
    return;
  }

  if (hasRename) {
    const duplicate = await db.query.categories.findFirst({
      where: eq(categories.name, nextName)
    });
    if (duplicate) {
      res.status(409).json({ error: "Category already exists." });
      return;
    }
  }

  const finalName = hasRename ? nextName : currentName;
  const maxOrderIndexRow = await db.query.categories.findMany({
    orderBy: [desc(categories.orderIndex)],
    limit: 1
  });
  const temporaryOrderIndex = (maxOrderIndexRow[0]?.orderIndex ?? 0) + 1;

  await db.transaction(async (tx) => {
    if (hasRename) {
      await tx.insert(categories).values({
        name: nextName,
        orderIndex: temporaryOrderIndex,
        color: existingCategory.color,
        colorDark: existingCategory.colorDark,
        colorLight: existingCategory.colorLight,
        archivedAt: archived === null ? existingCategory.archivedAt : archived ? new Date() : null
      });

      await tx
        .update(transactions)
        .set({ categoryName: nextName, updatedAt: new Date() })
        .where(eq(transactions.categoryName, currentName));
      await tx
        .update(merchants)
        .set({ categoryName: nextName, updatedAt: new Date() })
        .where(eq(merchants.categoryName, currentName));
      await tx
        .update(budgets)
        .set({ categoryName: nextName, updatedAt: new Date() })
        .where(eq(budgets.categoryName, currentName));
      await tx
        .update(budgetPeriods)
        .set({ categoryName: nextName, updatedAt: new Date() })
        .where(eq(budgetPeriods.categoryName, currentName));

      await tx.delete(categories).where(eq(categories.name, currentName));
      await tx
        .update(categories)
        .set({ orderIndex: existingCategory.orderIndex })
        .where(eq(categories.name, nextName));
    } else if (archived !== null) {
      await tx
        .update(categories)
        .set({ archivedAt: archived ? new Date() : null })
        .where(eq(categories.name, currentName));
    }
  });

  res.json({ ok: true, categoryName: finalName });
});

router.get("/budget-limits", async (req, res) => {
  const rows = await db.query.budgets.findMany({
    where: eq(budgets.userId, req.authUser!.id)
  });

  res.json(
    rows.map((row) => ({
      userId: row.userId,
      categoryName: row.categoryName,
      limit: Number(row.limit)
    }))
  );
});

router.put("/budgets", async (req, res) => {
  const payload = Array.isArray(req.body?.budgets) ? req.body.budgets : [];
  const month = req.body?.month ? Number(req.body.month) : null;
  const year = req.body?.year ? Number(req.body.year) : null;
  const upserts = payload
    .filter((budget: Record<string, unknown>) => budget.limit !== null && budget.limit !== "")
    .map((budget: Record<string, unknown>) => ({
      userId: req.authUser!.id,
      categoryName: String(budget.categoryName),
      ...(month && year ? { month, year } : {}),
      limit: String(Number(budget.limit))
    }));

  const deletes = payload
    .filter((budget: Record<string, unknown>) => budget.limit === null || budget.limit === "")
    .map((budget: Record<string, unknown>) => String(budget.categoryName));

  if (month && year) {
    if (upserts.length > 0) {
      await db
        .insert(budgetPeriods)
        .values(upserts)
        .onConflictDoUpdate({
          target: [
            budgetPeriods.userId,
            budgetPeriods.categoryName,
            budgetPeriods.month,
            budgetPeriods.year
          ],
          set: {
            limit: sql`excluded.limit`,
            updatedAt: new Date()
          }
        });
    }

    if (deletes.length > 0) {
      await db
        .delete(budgetPeriods)
        .where(
          and(
            eq(budgetPeriods.userId, req.authUser!.id),
            eq(budgetPeriods.month, month),
            eq(budgetPeriods.year, year),
            inArray(budgetPeriods.categoryName, deletes)
          )
        );
    }
  } else {
    if (upserts.length > 0) {
      await db
        .insert(budgets)
        .values(upserts)
        .onConflictDoUpdate({
          target: [budgets.userId, budgets.categoryName],
          set: {
            limit: sql`excluded.limit`,
            updatedAt: new Date()
          }
        });
    }

    if (deletes.length > 0) {
      await db
        .delete(budgets)
        .where(and(eq(budgets.userId, req.authUser!.id), inArray(budgets.categoryName, deletes)));
    }
  }

  res.json({ ok: true });
});

router.post("/budgets/copy-previous", async (req, res) => {
  const month = Number(req.body?.month);
  const year = Number(req.body?.year);

  if (!month || !year) {
    res.status(400).json({ error: "month and year are required." });
    return;
  }

  res.json(await copyBudgetsFromPreviousPeriod(req.authUser!.id, month, year));
});

router.get("/merchants", async (req, res) => {
  const rows = await db
    .select({
      id: merchants.id,
      text: merchants.text,
      type: merchants.type,
      categoryName: merchants.categoryName,
      category: categories
    })
    .from(merchants)
    .innerJoin(categories, eq(merchants.categoryName, categories.name))
    .where(eq(merchants.userId, req.authUser!.id))
    .orderBy(asc(merchants.id));

  res.json(
    rows.map((row) => ({
      id: row.id,
      text: row.text,
      type: row.type,
      category: row.category
    }))
  );
});

router.post("/merchants", async (req, res) => {
  const payload = req.body?.merchantSetting;
  if (payload.id) {
    await db
      .update(merchants)
      .set({
        text: String(payload.text),
        type: payload.type,
        categoryName: String(payload.categoryName),
        updatedAt: new Date()
      })
      .where(and(eq(merchants.id, Number(payload.id)), eq(merchants.userId, req.authUser!.id)));
  } else {
    await db.insert(merchants).values({
      userId: req.authUser!.id,
      text: String(payload.text),
      type: payload.type,
      categoryName: String(payload.categoryName)
    });
  }

  res.json({ ok: true });
});

router.delete("/merchants/:id", async (req, res) => {
  await db
    .delete(merchants)
    .where(and(eq(merchants.id, Number(req.params.id)), eq(merchants.userId, req.authUser!.id)));
  res.json({ ok: true });
});

router.post("/merchants/apply-existing", async (req, res) => {
  res.json(await applyMerchantRulesToExistingTransactions(req.authUser!.id));
});

router.get("/uploads", async (req, res) => {
  const rows = await db.query.uploads.findMany({
    where: eq(uploads.userId, req.authUser!.id),
    orderBy: [desc(uploads.createdAt)]
  });
  res.json(rows);
});

router.post("/uploads", async (req, res) => {
  const payload = req.body?.upload;
  await db.insert(uploads).values({
    id: String(payload.id),
    userId: req.authUser!.id,
    files: String(payload.files),
    transactionsUploaded: Number(payload.transactionsUploaded)
  });
  res.json({ ok: true });
});

router.post("/uploads/preview", async (req, res) => {
  const uploadId = String(req.body?.uploadId ?? "");
  const files = Array.isArray(req.body?.files) ? req.body.files : [];

  if (!uploadId || files.length === 0) {
    res.status(400).json({ error: "Upload preview requires an upload id and at least one file." });
    return;
  }

  res.json(await previewTransactionsImport(req.authUser!.id, uploadId, files));
});

router.post("/uploads/commit", async (req, res) => {
  const uploadId = String(req.body?.uploadId ?? "");
  const filesLabel = String(req.body?.filesLabel ?? "");
  const payload = Array.isArray(req.body?.transactions) ? req.body.transactions : [];

  if (!uploadId || !filesLabel) {
    res.status(400).json({ error: "Upload commit requires an upload id and file metadata." });
    return;
  }

  res.json(await commitTransactionsImport(req.authUser!.id, uploadId, filesLabel, payload));
});

router.delete("/uploads/:id", async (req, res) => {
  await db.delete(uploads).where(and(eq(uploads.id, req.params.id), eq(uploads.userId, req.authUser!.id)));
  res.json({ ok: true });
});

export { router as workspaceRouter };
