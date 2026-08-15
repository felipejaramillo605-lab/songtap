import { describe, expect, it } from "vitest";
import { isExternalMusicProvider, providerConnectionMessage } from "./musicProvider";

describe("musicProvider", () => {
  it("mantiene el proveedor manual como respaldo sin conexión externa", () => {
    expect(isExternalMusicProvider("manual")).toBe(false);
    expect(providerConnectionMessage("manual", "not_configured")).toContain("Staff controla");
  });

  it("marca proveedores externos como pendientes sin prometer reproducción automática", () => {
    expect(isExternalMusicProvider("youtube")).toBe(true);
    expect(providerConnectionMessage("youtube", "pending")).toContain("modo manual activo");
  });
});
