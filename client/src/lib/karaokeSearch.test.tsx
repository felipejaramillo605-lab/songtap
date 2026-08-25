import { describe, expect, it } from "vitest";
import { buildKaraokeSearchUrl } from "./karaokeSearch";

describe("buildKaraokeSearchUrl", () => {
  it("crea una búsqueda externa con título, artista y contexto de karaoke sin conservar contenido", () => {
    expect(buildKaraokeSearchUrl("  Vivir   Mi Vida ", " Marc Anthony ")).toBe(
      "https://www.youtube.com/results?search_query=Vivir+Mi+Vida+Marc+Anthony+karaoke+con+letra"
    );
  });

  it("funciona cuando todavía no se conoce el artista", () => {
    expect(buildKaraokeSearchUrl("La canción", null)).toBe(
      "https://www.youtube.com/results?search_query=La+canci%C3%B3n+karaoke+con+letra"
    );
  });
});
