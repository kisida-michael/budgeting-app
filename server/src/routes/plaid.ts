import { Router } from "express";
import { requireSession } from "../auth/session.js";
import { getPlaidUnavailableReason, isPlaidConfigured } from "../plaid/client.js";
import {
  createPlaidLinkToken,
  disconnectPlaidItem,
  exchangePlaidPublicToken,
  getPlaidStatus,
  syncAllPlaidItems,
  syncPlaidItemTransactions
} from "../plaid/service.js";

const router = Router();

router.use(requireSession);

router.get("/status", async (req, res) => {
  const status = await getPlaidStatus(req.authUser!.id);

  res.json({
    available: isPlaidConfigured(),
    reason: getPlaidUnavailableReason(),
    ...status
  });
});

router.post("/link-token", async (req, res) => {
  if (!isPlaidConfigured()) {
    res.status(503).json({ error: getPlaidUnavailableReason() });
    return;
  }

  const data = await createPlaidLinkToken(req.authUser!.id);
  res.json(data);
});

router.post("/exchange", async (req, res) => {
  if (!isPlaidConfigured()) {
    res.status(503).json({ error: getPlaidUnavailableReason() });
    return;
  }

  const publicToken = String(req.body?.publicToken ?? "");
  if (!publicToken) {
    res.status(400).json({ error: "publicToken is required." });
    return;
  }

  try {
    const result = await exchangePlaidPublicToken({
      userId: req.authUser!.id,
      publicToken,
      institutionId: req.body?.institutionId ? String(req.body.institutionId) : null,
      institutionName: req.body?.institutionName ? String(req.body.institutionName) : null
    });

    res.json(result);
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Plaid token exchange failed."
    });
  }
});

router.post("/sync", async (req, res) => {
  if (!isPlaidConfigured()) {
    res.status(503).json({ error: getPlaidUnavailableReason() });
    return;
  }

  try {
    const itemId = req.body?.itemId ? String(req.body.itemId) : null;
    const result = itemId
      ? await syncPlaidItemTransactions(req.authUser!.id, itemId)
      : await syncAllPlaidItems(req.authUser!.id);

    res.json(result);
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Plaid sync failed."
    });
  }
});

router.delete("/items/:itemId", async (req, res) => {
  if (!isPlaidConfigured()) {
    res.status(503).json({ error: getPlaidUnavailableReason() });
    return;
  }

  try {
    const result = await disconnectPlaidItem(req.authUser!.id, String(req.params.itemId));
    res.json(result);
  } catch (error) {
    res.status(404).json({
      error: error instanceof Error ? error.message : "Plaid item not found."
    });
  }
});

export { router as plaidRouter };
