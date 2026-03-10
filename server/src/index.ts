import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import { sql } from "drizzle-orm";
import { env } from "./env.js";
import { createAppMetaResponse, createHealthResponse } from "@budget/shared";
import { db, connection } from "./db/client.js";
import { authRouter } from "./routes/auth.js";
import { plaidRouter } from "./routes/plaid.js";
import { workspaceRouter } from "./routes/workspace.js";

const app = express();

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json(createHealthResponse());
});

app.get("/api/meta", (_req, res) => {
  res.json(
    createAppMetaResponse({
      name: "jsheehan-budget-rewrite",
      version: "0.1.0",
      authProvider: "Express cookie session auth",
      transactionSource: "CSV import parity from original source",
      interfaceSource: "Legacy budgeting-app layout and green/slate visual style",
      persistence: "Postgres + Drizzle"
    })
  );
});

app.get("/api/db/health", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ ok: true, provider: "postgres" });
  } catch (error) {
    res.status(503).json({
      ok: false,
      provider: "postgres",
      error: error instanceof Error ? error.message : "Unknown database error"
    });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/plaid", plaidRouter);
app.use("/api", workspaceRouter);

app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT}`);
});

process.on("SIGINT", async () => {
  await connection.end({ timeout: 0 });
  process.exit(0);
});
