import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { whitelist } from "../db/schema.js";
import { optionalSession } from "../auth/session.js";

export const authRouter = Router();

authRouter.get("/session", optionalSession, (req, res) => {
  if (!req.authUser) {
    res.json({ session: null });
    return;
  }

  res.json({
    session: {
      user: req.authUser
    }
  });
});

authRouter.get("/whitelist", async (req, res) => {
  const email = String(req.query.email ?? "").trim().toLowerCase();
  if (!email) {
    res.json({ whitelisted: false });
    return;
  }

  const match = await db.query.whitelist.findFirst({
    where: eq(whitelist.email, email)
  });

  res.json({ whitelisted: Boolean(match) });
});
