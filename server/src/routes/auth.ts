import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { appUsers, whitelist } from "../db/schema.js";
import { clearSessionCookie, optionalSession, setSessionCookie } from "../auth/session.js";

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

authRouter.post("/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  const user = await db.query.appUsers.findFirst({
    where: eq(appUsers.email, email)
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  setSessionCookie(res, { id: user.id, email: user.email });
  res.json({ session: { user: { id: user.id, email: user.email } } });
});

authRouter.post("/signup", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  const whitelisted = await db.query.whitelist.findFirst({
    where: eq(whitelist.email, email)
  });

  if (!whitelisted) {
    res.status(403).json({ error: "Email is not whitelisted for signup." });
    return;
  }

  const existing = await db.query.appUsers.findFirst({
    where: eq(appUsers.email, email)
  });

  if (existing) {
    res.status(409).json({ error: "An account already exists for this email." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(appUsers)
    .values({ email, passwordHash })
    .returning({ id: appUsers.id, email: appUsers.email });

  setSessionCookie(res, user);
  res.json({ session: { user } });
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
