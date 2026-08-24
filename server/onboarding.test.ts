import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getUserOnboardingProgress: vi.fn(),
  markUserOnboardingOpened: vi.fn(),
  completeUserOnboarding: vi.fn(),
  resetUserOnboarding: vi.fn(),
  createSupportTicket: vi.fn(),
  getSupportTicketsForUser: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { onboardingRouter } from "./routers/onboarding";

function context(role: "owner" | "manager" | "staff" | "user" = "manager", venueId: number | null = 30001) {
  return { user: { id: 25, openId: "onboarding-test", name: "Usuario", email: "user@songtap.test", loginMethod: "password", role, venueId, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {} }, res: {} } as any;
}

describe("onboarding router", () => {
  it("guarda el progreso usando el rol autenticado", async () => {
    dbMocks.completeUserOnboarding.mockResolvedValueOnce({ id: 1, userId: 25, role: "manager", completedAt: new Date() });
    await expect(onboardingRouter.createCaller(context("manager")).complete()).resolves.toMatchObject({ userId: 25, role: "manager" });
    expect(dbMocks.completeUserOnboarding).toHaveBeenCalledWith(25, "manager");
  });

  it("reporta una incidencia con ruta, rol y local derivados del contexto seguro", async () => {
    dbMocks.createSupportTicket.mockResolvedValueOnce(63);
    const caller = onboardingRouter.createCaller(context("staff", 30001));
    await expect(caller.reportIssue({ route: "/staff/music", title: "No actualiza la cola", description: "Al marcar una canción no cambia la selección visible en la cola." })).resolves.toEqual({ ticketId: 63 });
    expect(dbMocks.createSupportTicket).toHaveBeenCalledWith(expect.objectContaining({ reporterId: 25, reporterRole: "staff", venueId: 30001, route: "/staff/music" }));
  });

  it("impide usar onboarding operativo a una cuenta sin rol autorizado", async () => {
    await expect(onboardingRouter.createCaller(context("user")).getProgress()).rejects.toThrow("solo está disponible para roles operativos");
  });
});
