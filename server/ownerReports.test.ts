import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getOwnerReportSchedule: vi.fn(),
  getOwnerScheduledReports: vi.fn(),
  saveOwnerReportSchedule: vi.fn(),
}));

vi.mock("./db", () => ({
  getOwnerReportSchedule: dbMocks.getOwnerReportSchedule,
  getOwnerScheduledReports: dbMocks.getOwnerScheduledReports,
  saveOwnerReportSchedule: dbMocks.saveOwnerReportSchedule,
}));

vi.mock("./_core/heartbeat", () => ({
  createHeartbeatJob: vi.fn(),
  updateHeartbeatJob: vi.fn(),
}));

import { colombiaWeeklyCron, ownerReportsRouter } from "./routers/ownerReports";

function context(role = "owner") {
  return {
    user: { id: 1, openId: "owner-test", name: "Owner", email: "owner@songtap.test", loginMethod: "password", role, venueId: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers: {} },
    res: {},
  } as any;
}

describe("owner reports router", () => {
  it("convierte la programación semanal de Colombia al cron UTC de seis campos", () => {
    expect(colombiaWeeklyCron({ weekday: 1, hour: 8, minute: 0, isEnabled: true })).toBe("0 0 13 * * 1");
    expect(colombiaWeeklyCron({ weekday: 7, hour: 20, minute: 30, isEnabled: true })).toBe("0 30 1 * * 1");
  });

  it("permite guardar una configuración desactivada sin crear un trabajo en desarrollo", async () => {
    dbMocks.getOwnerReportSchedule.mockResolvedValueOnce(null);
    dbMocks.saveOwnerReportSchedule.mockResolvedValueOnce({ id: 2, isEnabled: false });

    await expect(ownerReportsRouter.createCaller(context()).configure({ weekday: 1, hour: 8, minute: 0, isEnabled: false })).resolves.toEqual({ id: 2, isEnabled: false });
    expect(dbMocks.saveOwnerReportSchedule).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: 1,
      cronExpression: "0 0 13 * * 1",
      taskUid: null,
      isEnabled: false,
    }));
  });

  it("rechaza el acceso de roles distintos al Owner", async () => {
    await expect(ownerReportsRouter.createCaller(context("manager")).getSchedule()).rejects.toThrow("Solo el Owner puede configurar reportes internos");
  });
});
