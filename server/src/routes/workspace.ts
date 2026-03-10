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
