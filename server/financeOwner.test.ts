import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getAuditLogs: vi.fn(),
  getFinanceSummary: vi.fn(),
  getOrderHistory: vi.fn(),
  getOwnerRevenueByDay: vi.fn(),
  getOwnerVenueAnalytics: vi.fn(),
  getRevenueByCategory: vi.fn(),
  getRevenueByHour: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { financeRouter } from "./routers/finance";

const ownerContext = { user: { id: 1, role: "owner", venueId: null }, req: {} as any, res: {} as any };
const managerContext = { user: { id: 2, role: "manager", venueId: 7 }, req: {} as any, res: {} as any };

describe("finance.ownerVenueAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getOwnerVenueAnalytics.mockResolvedValue([
      { venueId: 7, venueName: "Bar Central", isActive: true, revenue: "120000", orderCount: "12", averageTicket: "10000" },
      { venueId: 8, venueName: "Karaoke Norte", isActive: true, revenue: "30000", orderCount: "3", averageTicket: "10000" },
    ]);
    dbMocks.getOwnerRevenueByDay.mockResolvedValue([{ date: "2026-08-15", revenue: "150000", orderCount: "15" }]);
  });

  it("entrega ranking de locales, tendencia y totales numéricos únicamente al Owner", async () => {
    const caller = financeRouter.createCaller(ownerContext as any);
    const dateFrom = new Date("2026-08-09T00:00:00.000Z");
    const dateTo = new Date("2026-08-15T23:59:59.999Z");
    const result = await caller.ownerVenueAnalytics({ dateFrom, dateTo });

    expect(dbMocks.getOwnerVenueAnalytics).toHaveBeenCalledWith(dateFrom, dateTo);
    expect(result.totals).toEqual({ revenue: 150000, orderCount: 15, averageTicket: 10000 });
    expect(result.venues[0]).toMatchObject({ venueName: "Bar Central", revenue: 120000, orderCount: 12 });
    expect(result.dailyRevenue).toEqual([{ date: "2026-08-15", revenue: 150000, orderCount: 15 }]);
  });

  it("no expone la analítica global a Managers", async () => {
    const caller = financeRouter.createCaller(managerContext as any);
    await expect(caller.ownerVenueAnalytics({ dateFrom: new Date("2026-08-09"), dateTo: new Date("2026-08-15") })).rejects.toThrow();
  });
});
