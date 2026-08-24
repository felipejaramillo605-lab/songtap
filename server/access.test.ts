import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  recordDeniedAccess: vi.fn(),
  createAccessRequest: vi.fn(),
}));

vi.mock("./db", () => ({
  recordDeniedAccess: dbMocks.recordDeniedAccess,
  createAccessRequest: dbMocks.createAccessRequest,
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
});
