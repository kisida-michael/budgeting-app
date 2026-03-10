import { Router } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  budgets,
  categories,
  configurations,
  merchants,
  transactions,
  uploads
} from "../db/schema.js";
import { requireSession } from "../auth/session.js";

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

function serializeTransaction(row: typeof transactions.$inferSelect) {
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
  const upserts = payload
    .filter((budget: Record<string, unknown>) => budget.limit !== null && budget.limit !== "")
    .map((budget: Record<string, unknown>) => ({
      userId: req.authUser!.id,
      categoryName: String(budget.categoryName),
      limit: String(Number(budget.limit))
    }));

  const deletes = payload
    .filter((budget: Record<string, unknown>) => budget.limit === null || budget.limit === "")
    .map((budget: Record<string, unknown>) => String(budget.categoryName));

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

  res.json({ ok: true });
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

router.delete("/uploads/:id", async (req, res) => {
  await db.delete(uploads).where(and(eq(uploads.id, req.params.id), eq(uploads.userId, req.authUser!.id)));
  res.json({ ok: true });
});

router.get("/plaid/status", (_req, res) => {
  res.json({ available: false, reason: "Plaid flow not wired yet in this pass." });
});

export { router as workspaceRouter };
