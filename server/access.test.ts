import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  recordDeniedAccess: vi.fn(),
  createAccessRequest: vi.fn(),
  getPendingAccessRequests: vi.fn(),
  resolveAccessRequest: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("./db", () => ({
  recordDeniedAccess: dbMocks.recordDeniedAccess,
  createAccessRequest: dbMocks.createAccessRequest,
  getPendingAccessRequests: dbMocks.getPendingAccessRequests,
  resolveAccessRequest: dbMocks.resolveAccessRequest,
  createAuditLog: dbMocks.createAuditLog,
}));

import { accessRouter } from "./routers/access";

function ctx(role: "owner" | "manager" | "staff" | "user", options: { mustChangePassword?: boolean } = {}) {
  return {
    user: {
      id: 71234,
      openId: "access-test-user",
      name: "Cuenta de prueba",
      email: "access@songtap.test",
      loginMethod: "password",
      role,
      venueId: 30001,
      mustChangePassword: options.mustChangePassword ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: {} },
    res: {},
  } as any;
}

describe("access router", () => {
  it("audita un intento denegado con su módulo seguro", async () => {
    dbMocks.recordDeniedAccess.mockResolvedValueOnce(true);
    const caller = accessRouter.createCaller(ctx("staff"));

    await expect(caller.recordDenied({ path: "/owner", reason: "role" })).resolves.toEqual({ success: true, recorded: true });
    expect(dbMocks.recordDeniedAccess).toHaveBeenCalledWith(expect.objectContaining({
      userId: 71234,
      userRole: "staff",
      targetPath: "/owner",
      moduleName: "Panel Owner",
      reason: "role",
    }));
  });

  it("crea una solicitud de acceso para el Owner cuando el rol no está autorizado", async () => {
    dbMocks.createAccessRequest.mockResolvedValueOnce({ created: true });
    const caller = accessRouter.createCaller(ctx("staff"));

    await expect(caller.request({ path: "/manager/menu" })).resolves.toEqual({ success: true, created: true });
    expect(dbMocks.createAccessRequest).toHaveBeenCalledWith(expect.objectContaining({
      userId: 71234,
      userRole: "staff",
      targetPath: "/manager/menu",
      moduleName: "Gestión de menú",
    }));
  });

  it("rechaza solicitudes para módulos ya autorizados y rutas no registradas", async () => {
    await expect(accessRouter.createCaller(ctx("manager")).request({ path: "/manager" })).rejects.toThrow("ya tiene acceso");
    await expect(accessRouter.createCaller(ctx("staff")).request({ path: "/owner/secret" })).rejects.toThrow("no es válida");
  });

  it("no permite que el Owner solicite acceso para sí mismo", async () => {
    await expect(accessRouter.createCaller(ctx("owner")).request({ path: "/staff" })).rejects.toThrow("no necesita solicitar acceso");
  });

  it("mantiene el bloqueo de solicitudes hasta completar el cambio de contraseña temporal", async () => {
    await expect(accessRouter.createCaller(ctx("staff", { mustChangePassword: true })).request({ path: "/owner" })).rejects.toThrow("Cambia tu contraseña temporal");
  });

  it("permite al Owner aprobar una solicitud válida y deja trazabilidad", async () => {
    const request = { id: 44, userId: 71235, venueId: 30001, requesterRole: "staff", targetPath: "/manager/menu", moduleName: "Gestión de menú" };
    dbMocks.getPendingAccessRequests.mockResolvedValueOnce([request]);
    dbMocks.resolveAccessRequest.mockResolvedValueOnce({ request, requester: { id: 71235 }, grantedRole: "manager" });

    await expect(accessRouter.createCaller(ctx("owner", {})).resolve({ requestId: 44, decision: "approved" })).resolves.toEqual({ success: true, decision: "approved" });
    expect(dbMocks.resolveAccessRequest).toHaveBeenCalledWith(expect.objectContaining({ requestId: 44, ownerId: 71234, decision: "approved", grantedRole: "manager" }));
    expect(dbMocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "ACCESS_APPROVED", entityId: 44 }));
  });

  it("exige motivo para rechazar y bloquea a quien no sea Owner", async () => {
    await expect(accessRouter.createCaller(ctx("owner")).resolve({ requestId: 44, decision: "rejected" })).rejects.toThrow("Indica el motivo");
    await expect(accessRouter.createCaller(ctx("manager")).resolve({ requestId: 44, decision: "approved" })).rejects.toThrow("required permission");
  });
});
