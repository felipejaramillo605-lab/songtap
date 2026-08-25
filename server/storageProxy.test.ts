import { describe, expect, it } from "vitest";
import { isPrivateStorageKey } from "./_core/storageProxy";

describe("Protección del proxy de almacenamiento", () => {
  it("identifica claves privadas y mantiene accesibles los recursos públicos", () => {
    expect(isPrivateStorageKey("private/cv/42/archivo.pdf")).toBe(true);
    expect(isPrivateStorageKey("uploads/42/avatar.jpg")).toBe(false);
  });
});
