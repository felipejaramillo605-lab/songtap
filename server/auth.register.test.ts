import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Auth Register & Manager Venue Request Tests", () => {
  const mockContext = {
    user: null,
    req: { cookies: {}, headers: { "x-forwarded-proto": "https" } } as any,
    res: { cookie: () => {}, clearCookie: () => {} } as any,
  };

  it("should register a standard user successfully", async () => {
    const caller = appRouter.createCaller(mockContext);

    const uniqueEmail = `testuser_${Date.now()}@example.com`;
    const res = await caller.auth.registerPassword({
      email: uniqueEmail,
      password: "password123",
      name: "Test User",
      accountType: "user",
    });

    expect(res.success).toBe(true);
    expect(res.user?.role).toBe("user");
    expect(res.user?.email).toBe(uniqueEmail);
  });

  it("should register a manager and create a venue request", async () => {
    const caller = appRouter.createCaller(mockContext);

    const uniqueEmail = `testmanager_${Date.now()}@example.com`;
    const res = await caller.auth.registerPassword({
      email: uniqueEmail,
      password: "password123",
      name: "Test Manager",
      accountType: "manager",
      venueName: "Bar de Prueba Test",
      venueAddress: "Calle 100",
      venuePhone: "+573001112233",
    });

    expect(res.success).toBe(true);
    expect(res.user?.role).toBe("manager");
    expect(res.user?.email).toBe(uniqueEmail);
  });

  it("should reject manager registration when venueName is missing", async () => {
    const caller = appRouter.createCaller(mockContext);

    const uniqueEmail = `testmanager_fail_${Date.now()}@example.com`;
    const promise = caller.auth.registerPassword({
      email: uniqueEmail,
      password: "password123",
      name: "Test Manager Bad",
      accountType: "manager",
      venueName: "",
    });

    await expect(promise).rejects.toThrow("El nombre del local es obligatorio");
  });
});
