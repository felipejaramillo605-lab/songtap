import { sdk } from "../_core/sdk";
import { getInventoryAutomationSettingsByTaskUid, runInventoryExpiryNotifications } from "../inventoryDb";
import type { Express, Request, Response } from "express";

/**
 * Revisa los lotes con saldo cada día. Solo acepta llamadas autenticadas por la
 * plataforma de programación y resuelve la configuración mediante taskUid.
 */
export function registerInventoryExpiryScheduleRoute(app: Express) {
  app.post("/api/scheduled/inventory-expiry", async (req: Request, res: Response) => {
    try {
      const actor = await sdk.authenticateRequest(req);
      if (!actor.isCron || !actor.taskUid) {
        return res.status(403).json({ ok: false, error: "Cron authentication required" });
      }
      const settings = await getInventoryAutomationSettingsByTaskUid(actor.taskUid);
      if (!settings) {
        return res.status(200).json({ ok: true, skipped: "orphan_or_disabled" });
      }
      const result = await runInventoryExpiryNotifications();
      return res.status(200).json({ ok: true, result });
    } catch (error) {
      console.error("[Inventory expiry] Failed", error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : "Unable to review inventory expiry",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
