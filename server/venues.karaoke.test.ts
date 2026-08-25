import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  approveVenueRequest: vi.fn(),
  createAuditLog: vi.fn(),
  createVenue: vi.fn(),
  createVenueRequest: vi.fn(),
  getAllVenues: vi.fn(),
  getPendingVenueRequests: vi.fn(),
  getVenueById: vi.fn(),
  getVenueRequestsByManager: vi.fn(),
  rejectVenueRequest: vi.fn(),
  updateVenue: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { venuesRouter } from "./routers/venues";

describe("venues.update proveedores de karaoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.updateVenue.mockResolvedValue(undefined);
    dbMocks.createAuditLog.mockResolvedValue(undefined);
  });

  it("persiste proveedores propios como configuración serializada del local del Manager", async () => {
    const caller = venuesRouter.createCaller({ user: { id: 5, role: "manager", venueId: 7 }, req: {}, res: {} } as any);
    const providers = [{ id: "karaoke-oficial", name: "Karaoke Oficial", searchUrl: "https://example.com/search?q={query}" }];

    await expect(caller.update({ id: 7, karaokeProviders: providers })).resolves.toEqual({ success: true });
    expect(dbMocks.updateVenue).toHaveBeenCalledWith(7, expect.objectContaining({ karaokeProviders: JSON.stringify(providers) }));
    await expect(caller.update({ id: 8, karaokeProviders: providers })).rejects.toThrow("FORBIDDEN");
  });

  it("rechaza proveedores sin marcador de búsqueda para no producir enlaces ambiguos", async () => {
    const caller = venuesRouter.createCaller({ user: { id: 5, role: "manager", venueId: 7 }, req: {}, res: {} } as any);
    await expect(caller.update({
      id: 7,
      karaokeProviders: [{ id: "incompleto", name: "Incompleto", searchUrl: "https://example.com/search" }],
    })).rejects.toThrow();
    expect(dbMocks.updateVenue).not.toHaveBeenCalled();
  });
});
