import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createTestModeIncident: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("./db", () => ({
  createTestModeIncident: dbMocks.createTestModeIncident,
  createAuditLog: dbMocks.createAuditLog,
}));

import { testIncidentsRouter } from "./routers/testIncidents";

function context(headers: Record<string, string> = {}) {
  return {
    user: { id: 1, openId: "owner-test", name: "Owner", email: "owner@songtap.test", loginMethod: "password", role: "owner", venueId: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers },
    res: {},
  } as any;
}

describe("test incidents router", () => {
  it("registra una incidencia con el contexto de previsualización derivado del servidor", async () => {
    dbMocks.createTestModeIncident.mockResolvedValueOnce(88);
    const caller = testIncidentsRouter.createCaller(context({ "x-songtap-preview": "1", "x-songtap-preview-role": "manager", "x-songtap-preview-venue": "30001" }));

    await expect(caller.create({ route: "/manager/menu", title: "Guardar no responde", description: "El formulario permanece abierto después de guardar los cambios." })).resolves.toEqual({ success: true, id: 88 });
    expect(dbMocks.createTestModeIncident).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 1, previewRole: "manager", venueId: 30001, route: "/manager/menu" }));
    expect(dbMocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE_TEST_INCIDENT", entityId: 88 }));
  });

  it("rechaza capturas fuera de una previsualización Owner válida", async () => {
    await expect(testIncidentsRouter.createCaller(context()).create({ route: "/manager", title: "Error visible", description: "No debe permitirse una captura sin contexto de previsualización." })).rejects.toThrow("solo está disponible durante una previsualización Owner válida");
  });
});
