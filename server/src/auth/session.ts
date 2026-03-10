import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";

export const SESSION_COOKIE = "budget_session";

export interface SessionUser {
  id: string;
  email: string;
}

interface SessionJwtPayload {
  sub: string;
  email: string;
}

export function createSessionToken(user: SessionUser) {
  return jwt.sign({ email: user.email }, env.AUTH_SECRET, {
    subject: user.id,
    expiresIn: "7d"
  });
}

export function setSessionCookie(res: Response, user: SessionUser) {
  res.cookie(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production"
  });
}

function readSessionUser(req: Request): SessionUser | null {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.AUTH_SECRET) as SessionJwtPayload;
    if (!payload.sub || !payload.email) {
      return null;
    }

    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export function optionalSession(req: Request, _res: Response, next: NextFunction) {
  req.authUser = readSessionUser(req);
  next();
}

export function requireSession(req: Request, res: Response, next: NextFunction) {
  const user = readSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.authUser = user;
  next();
}
