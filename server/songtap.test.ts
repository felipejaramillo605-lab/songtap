import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  const clearedCookies: unknown[] = [];
  return {
    user: {
      id: 1,
      openId: "test-owner",
      email: "owner@test.com",
      name: "Test Owner",
      loginMethod: "manus",
      role: "owner" as const,
      venueId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (_name: string, _opts: unknown) => clearedCookies.push({ _name, _opts }),
    } as TrpcContext["res"],
  };
}

// ─── Auth tests ──────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeTruthy();
    expect(user?.role).toBe("owner");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

// ─── Venues tests ────────────────────────────────────────────────────────────

describe("venues.list", () => {
  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.venues.list()).rejects.toThrow();
  });

  it("returns an array for authenticated owner", async () => {
    const ctx = makeCtx({ role: "owner" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.venues.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Users tests ─────────────────────────────────────────────────────────────

describe("users.list", () => {
  it("staff without venueId gets empty list", async () => {
    // Staff without venueId assigned returns empty array (not an error)
    const ctx = makeCtx({ role: "staff" as const, venueId: null });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("returns array for owner", async () => {
    const ctx = makeCtx({ role: "owner" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Menu tests ──────────────────────────────────────────────────────────────

describe("menu.getPublicMenu", () => {
  it("returns empty array for non-existent venue", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.menu.getPublicMenu({ venueId: 99999 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

// ─── QR tests ────────────────────────────────────────────────────────────────

describe("qr.validateTable", () => {
  it("throws for invalid QR token", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.qr.validateTable({ qrToken: "invalid-token-xyz" })).rejects.toThrow();
  });
});

// ─── Finance tests ───────────────────────────────────────────────────────────

describe("finance.summary", () => {
  it("staff cannot access another venue's finance summary", async () => {
    // Staff can only access their own venue; venueId mismatch should still return empty
    const ctx = makeCtx({ role: "staff" as const, venueId: 2 });
    const caller = appRouter.createCaller(ctx);
    // Finance summary is restricted to manager/owner - staff should get FORBIDDEN
    await expect(
      caller.finance.summary({ venueId: 1, dateFrom: new Date(), dateTo: new Date() })
    ).rejects.toThrow();
  });

  it("returns summary object for manager", async () => {
    const ctx = makeCtx({ role: "manager" as const, venueId: 99999 });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finance.summary({
      venueId: 99999,
      dateFrom: new Date("2025-01-01"),
      dateTo: new Date("2025-12-31"),
    });
    expect(result).toHaveProperty("revenue");
    expect(result).toHaveProperty("cost");
    expect(result).toHaveProperty("profit");
    expect(result).toHaveProperty("orderCount");
  });
});

// ─── Music tests ─────────────────────────────────────────────────────────────

describe("music.getQueue", () => {
  it("requires staff or higher role", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.music.getQueue({ venueId: 1 })).rejects.toThrow();
  });

  it("returns array for staff", async () => {
    const ctx = makeCtx({ role: "staff" as const, venueId: 99999 });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.music.getQueue({ venueId: 99999 });
    expect(Array.isArray(result)).toBe(true);
  });
});
