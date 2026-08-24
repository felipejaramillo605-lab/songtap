// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { clearPreviewMode, getPreviewMode, setPreviewMode } from "./previewMode";

describe("previewMode", () => {
  afterEach(() => {
    clearPreviewMode();
  });

  it("mantiene una referencia estable cuando el modo de pruebas no cambia", () => {
    setPreviewMode({ role: "manager", venueId: 30001, venueName: "Bar La Noche" });

    const firstSnapshot = getPreviewMode();
    const secondSnapshot = getPreviewMode();

    expect(firstSnapshot).toEqual({ role: "manager", venueId: 30001, venueName: "Bar La Noche" });
    expect(secondSnapshot).toBe(firstSnapshot);
  });

  it("restaura una instantánea nula estable al salir del modo de pruebas", () => {
    clearPreviewMode();

    expect(getPreviewMode()).toBeNull();
    expect(getPreviewMode()).toBeNull();
  });
});
