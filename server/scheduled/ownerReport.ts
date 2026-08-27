import type { Express } from "express";
import { sdk } from "../_core/sdk";
import { generateOwnerScheduledReport } from "../db";
import { scheduledCallbackError } from "./scheduledAuth";

/**
 * Registers the internal callback used exclusively by the Heartbeat scheduler.
 * The business schedule is resolved from the authenticated task UID, never from
 * a request body, so a caller cannot select another Owner's schedule.
 */
export function registerOwnerReportScheduleRoute(app: Express) {
  app.post("/api/scheduled/owner-report", async (req, res) => {
    try {
      const actor = await sdk.authenticateRequest(req);
      if (!actor.isCron || !actor.taskUid) {
        return res.status(403).json({ ok: false, error: "Cron authentication required" });
      }

      const result = await generateOwnerScheduledReport(actor.taskUid);
      return res.status(200).json({ ok: true, result });
    } catch (error) {
      console.error("[Owner scheduled report] Failed", error);
      const response = scheduledCallbackError(error);
      return res.status(response.status).json(response.body);
    }
  });
}
