import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";

export interface SessionUser {
  id: string;
  email: string;
}

function readSessionUser(req: Request): SessionUser | null {
  const auth = getAuth(req);
  if (!auth.userId) {
    return null;
  }

  const claims = auth.sessionClaims as Record<string, unknown> | undefined;
  const emailClaim = claims?.email;
  const emailAddressClaim = claims?.email_address;
  const email =
    typeof emailClaim === "string"
      ? emailClaim
      : typeof emailAddressClaim === "string"
        ? emailAddressClaim
        : "";

  return { id: auth.userId, email };
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
