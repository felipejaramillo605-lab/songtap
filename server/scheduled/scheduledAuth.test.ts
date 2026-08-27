import { describe, expect, it } from "vitest";
import { ForbiddenError } from "../../shared/_core/errors";
import { scheduledCallbackError } from "./scheduledAuth";

describe("scheduledCallbackError", () => {
  it("normaliza fallos de sesión como 403 sin exponer detalles internos", () => {
    expect(scheduledCallbackError(ForbiddenError("Invalid session cookie"))).toEqual({
      status: 403,
      body: { ok: false, error: "Cron authentication required" },
    });
  });

  it("mantiene los fallos no autorizados separados de errores internos", () => {
    expect(scheduledCallbackError(new Error("database host detail"))).toEqual({
      status: 500,
      body: { ok: false, error: "Internal scheduled task error" },
    });
  });
});
