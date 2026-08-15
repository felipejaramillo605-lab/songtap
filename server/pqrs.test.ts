import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createAuditLog: vi.fn(),
  createPqrsTicket: vi.fn(),
  getPqrsTicketForVenue: vi.fn(),
  getPqrsTicketsBySession: vi.fn(),
  getPqrsTicketsByVenue: vi.fn(),
  getQrSessionByToken: vi.fn(),
  updatePqrsTicketForVenue: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { pqrsRouter } from "./routers/pqrs";

const publicContext = { user: null, req: {} as any, res: {} as any };
const managerContext = {
  user: { id: 91, role: "manager", venueId: 7, name: "Manager de prueba" },
  req: {} as any,
  res: {} as any,
};

describe("pqrs router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getQrSessionByToken.mockResolvedValue({ id: 70, venueId: 7, tableId: 3, clientName: "Camila", isActive: true });
    dbMocks.createPqrsTicket.mockResolvedValue({ insertId: 120 });
    dbMocks.getPqrsTicketsBySession.mockResolvedValue([]);
    dbMocks.getPqrsTicketsByVenue.mockResolvedValue([]);
    dbMocks.getPqrsTicketForVenue.mockResolvedValue({ id: 120, venueId: 7, status: "open", response: null, respondedByUserId: null, respondedAt: null });
    dbMocks.updatePqrsTicketForVenue.mockResolvedValue(true);
  });

  it("crea una PQRS únicamente para la sesión QR y el local que la autorizan", async () => {
    const caller = pqrsRouter.createCaller(publicContext as any);
    await expect(caller.create({
      sessionToken: "valid-pqrs-session-token",
      sessionId: 70,
      venueId: 7,
      tableId: 3,
      type: "suggestion",
      subject: "Mejorar el sonido",
      message: "Sería ideal reducir el volumen de los parlantes cercanos.",
    })).resolves.toEqual({ success: true, ticketId: 120 });

    expect(dbMocks.createPqrsTicket).toHaveBeenCalledWith(expect.objectContaining({
      venueId: 7,
      tableId: 3,
      sessionId: 70,
      clientName: "Camila",
      type: "suggestion",
      status: "open",
    }));
  });

  it("bloquea el acceso a PQRS cuando el token QR no coincide con la sesión", async () => {
    dbMocks.getQrSessionByToken.mockResolvedValue({ id: 70, venueId: 8, tableId: 3, clientName: "Camila", isActive: true });
    const caller = pqrsRouter.createCaller(publicContext as any);
    await expect(caller.getMyTickets({ sessionToken: "valid-pqrs-session-token", sessionId: 70, venueId: 7 })).rejects.toThrow("sesión QR no es válida");
    expect(dbMocks.getPqrsTicketsBySession).not.toHaveBeenCalled();
  });

  it("impide que un Manager consulte las PQRS de otro local", async () => {
    const caller = pqrsRouter.createCaller(managerContext as any);
    await expect(caller.listByVenue({ venueId: 8 })).rejects.toThrow("No tienes acceso");
    expect(dbMocks.getPqrsTicketsByVenue).not.toHaveBeenCalled();
  });

  it("actualiza estado y respuesta usando ticketId y venueId como alcance obligatorio", async () => {
    const caller = pqrsRouter.createCaller(managerContext as any);
    await expect(caller.update({
      venueId: 7,
      ticketId: 120,
      status: "resolved",
      response: "Gracias por avisarnos. Ajustamos el volumen en la zona.",
    })).resolves.toEqual({ success: true });

    expect(dbMocks.updatePqrsTicketForVenue).toHaveBeenCalledWith(120, 7, expect.objectContaining({
      status: "resolved",
      response: "Gracias por avisarnos. Ajustamos el volumen en la zona.",
      respondedByUserId: 91,
    }));
    expect(dbMocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      venueId: 7,
      entity: "pqrs_ticket",
      entityId: 120,
      action: "PQRS_RESOLVED",
    }));
  });

  it("recorre una PQRS desde la sesión QR autorizada hasta la respuesta visible del local", async () => {
    const client = pqrsRouter.createCaller(publicContext as any);
    const manager = pqrsRouter.createCaller(managerContext as any);
    const created = await client.create({
      sessionToken: "valid-pqrs-session-token",
      sessionId: 70,
      venueId: 7,
      tableId: 3,
      type: "complaint",
      subject: "Temperatura incómoda",
      message: "El aire acondicionado está demasiado fuerte cerca de nuestra mesa.",
    });
    expect(created).toEqual({ success: true, ticketId: 120 });

    dbMocks.getPqrsTicketsByVenue.mockResolvedValue([{ id: 120, venueId: 7, status: "open" }]);
    await expect(manager.listByVenue({ venueId: 7, status: "open" })).resolves.toEqual([{ id: 120, venueId: 7, status: "open" }]);

    await manager.update({
      venueId: 7,
      ticketId: 120,
      status: "resolved",
      response: "Gracias por avisarnos. Ajustamos la temperatura en tu zona.",
    });
    expect(dbMocks.updatePqrsTicketForVenue).toHaveBeenCalledWith(120, 7, expect.objectContaining({ status: "resolved" }));

    dbMocks.getPqrsTicketsBySession.mockResolvedValue([{ id: 120, venueId: 7, status: "resolved", response: "Gracias por avisarnos. Ajustamos la temperatura en tu zona." }]);
    await expect(client.getMyTickets({ sessionToken: "valid-pqrs-session-token", sessionId: 70, venueId: 7 })).resolves.toEqual([
      { id: 120, venueId: 7, status: "resolved", response: "Gracias por avisarnos. Ajustamos la temperatura en tu zona." },
    ]);
  });
});
