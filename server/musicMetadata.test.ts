import { describe, expect, it } from "vitest";
import { normalizeMusicMetadata } from "./musicMetadata";

describe("normalizeMusicMetadata", () => {
  it("normaliza espacios y separadores sin usar fuentes externas", () => {
    expect(normalizeMusicMetadata("  Vivir   Mi Vida — Marc Anthony ", "Artista desconocido")).toEqual({
      songName: "Vivir Mi Vida",
      artist: "Marc Anthony",
      changed: true,
    });
  });

  it("mantiene los datos ya consistentes y ofrece respaldo cuando falta artista", () => {
    expect(normalizeMusicMetadata("Bailando", "Enrique Iglesias")).toEqual({ songName: "Bailando", artist: "Enrique Iglesias", changed: false });
    expect(normalizeMusicMetadata("Canción nueva", " ")).toEqual({ songName: "Canción nueva", artist: "Artista por confirmar", changed: true });
  });
});
