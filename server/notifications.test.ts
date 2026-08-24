import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

const baseRequest = { cookies: {}, headers: { "x-forwarded-proto": "https" } } as any;
const baseResponse = { cookie: () => {}, clearCookie: () => {} } as any;

describe("notifications history", () => {
  it("permite al Owner consultar su historial y contador de alertas", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "owner-notifications-test",
        name: "Owner Test",
        email: "owner@example.com",
        loginMethod: "password",
        role: "owner",
        venueId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: baseRequest,
      res: baseResponse,
    } as any);

    const [history, unreadCount] = await Promise.all([
      caller.notifications.getHistory({ limit: 10 }),
      caller.notifications.getUnreadCount(),
    ]);

    expect(Array.isArray(history)).toBe(true);
    expect(typeof unreadCount).toBe("number");
  });

  it("rechaza el acceso de roles que no sean Owner", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 999999,
        openId: "staff-notifications-test",
        name: "Staff Test",
        email: "staff@example.com",
        loginMethod: "password",
        role: "staff",
        venueId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: baseRequest,
      res: baseResponse,
    } as any);

    await expect(caller.notifications.getHistory({ limit: 10 })).rejects.toThrow("FORBIDDEN");
    await expect(caller.notifications.markAllRead()).rejects.toThrow("FORBIDDEN");
  });

  it("permite a un Staff consultar únicamente su historial personal de decisiones", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 999999,
        openId: "staff-personal-notifications-test",
        name: "Staff Test",
        email: "staff@example.com",
        loginMethod: "password",
        role: "staff",
        venueId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: baseRequest,
      res: baseResponse,
    } as any);

    const [history, unreadCount, decisions] = await Promise.all([
      caller.notifications.getMyHistory({ limit: 10 }),
      caller.notifications.getMyUnreadCount(),
      caller.access.getMyDecisionHistory({ limit: 10 }),
    ]);

    expect(Array.isArray(history)).toBe(true);
    expect(typeof unreadCount).toBe("number");
    expect(Array.isArray(decisions)).toBe(true);
    await expect(caller.notifications.archiveMyRead({ id: 1 })).resolves.toEqual({ success: false });
    await expect(caller.notifications.archiveAllMyRead()).resolves.toEqual({ success: true });
  });
});
