import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ createAuditLog: vi.fn() }));
const learningMocks = vi.hoisted(() => ({
  createGuideContentMedia: vi.fn(),
  createManagedGuideContent: vi.fn(),
  deleteManagedGuideContent: vi.fn(),
  getGuideContentMedia: vi.fn(),
  getManagedGuideContents: vi.fn(),
  getGuideSearchMisses: vi.fn(),
  recordGuideSearchMiss: vi.fn(),
  searchGuideContentSuggestions: vi.fn(),
  updateManagedGuideContent: vi.fn(),
}));
const storageMocks = vi.hoisted(() => ({ storagePut: vi.fn() }));

vi.mock("./db", () => dbMocks);
vi.mock("./guideContentDb", () => learningMocks);
vi.mock("./storage", () => storageMocks);

import { learningRouter } from "./routers/learning";

function context(role: "owner" | "manager" | "staff" = "owner") {
  return { user: { id: 11, openId: "learning-owner", name: "Owner", email: "owner@songtap.test", loginMethod: "password", role, venueId: role === "owner" ? null : 30001, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {} }, res: {} } as any;
}

const content = { contentType: "tutorial" as const, slug: "conteos-seguros", title: "Conteos seguros", summary: "Aprende a revisar y conciliar un conteo físico de forma segura.", body: "Completa todas las líneas, revisa diferencias y solicita aprobación cuando el umbral lo requiera.", roles: ["manager"] as const, category: "Inventario", modulePath: "/manager/inventory", durationMinutes: 8, sortOrder: 1, isActive: true };

describe("learning router", () => {
  it("solo permite a Owner crear contenido de guía y registra auditoría", async () => {
    learningMocks.createManagedGuideContent.mockResolvedValueOnce({ id: 51, ...content });
    const caller = learningRouter.createCaller(context("owner"));
    await expect(caller.adminCreate(content)).resolves.toMatchObject({ id: 51, slug: "conteos-seguros" });
    expect(learningMocks.createManagedGuideContent).toHaveBeenCalledWith(expect.objectContaining({ userId: 11, slug: "conteos-seguros" }));
    expect(dbMocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "GUIDE_CONTENT_CREATED", entityId: 51 }));
    await expect(learningRouter.createCaller(context("manager")).adminCreate(content)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("entrega sugerencias solo dentro del rol autenticado", async () => {
    learningMocks.searchGuideContentSuggestions.mockResolvedValueOnce([{ id: 51, title: "Conteos seguros" }]);
    await expect(learningRouter.createCaller(context("manager")).suggestions({ query: "conteos" })).resolves.toEqual([{ id: 51, title: "Conteos seguros" }]);
    expect(learningMocks.searchGuideContentSuggestions).toHaveBeenCalledWith("conteos", "manager");
  });

  it("permite eliminar contenido únicamente a Owner y conserva la auditoría", async () => {
    learningMocks.deleteManagedGuideContent.mockResolvedValueOnce({ id: 51, title: "Conteos seguros" });
    await expect(learningRouter.createCaller(context("owner")).adminDelete({ id: 51 })).resolves.toEqual({ success: true });
    expect(dbMocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "GUIDE_CONTENT_DELETED", entityId: 51 }));
  });

  it("registra una búsqueda sin resultado con el rol autenticado", async () => {
    await expect(learningRouter.createCaller(context("staff")).recordSearchMiss({ query: "receta vegana" })).resolves.toEqual({ success: true });
    expect(learningMocks.recordGuideSearchMiss).toHaveBeenCalledWith({ query: "receta vegana", role: "staff" });
  });

  it("solo permite a Owner subir una imagen de guía validada y deja auditoría", async () => {
    storageMocks.storagePut.mockResolvedValueOnce({ key: "guides/11/example.png", url: "/manus-storage/guides/11/example.png" });
    learningMocks.createGuideContentMedia.mockResolvedValueOnce({ id: 71, url: "/manus-storage/guides/11/example.png" });
    const result = await learningRouter.createCaller(context("owner")).uploadGuideImage({ filename: "paso.png", contentType: "image/png", altText: "Pantalla de ejemplo", base64Data: "data:image/png;base64,iVBORw0KGgo=" });
    expect(result).toMatchObject({ id: 71 });
    expect(storageMocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^guides\/11\//), expect.any(Buffer), "image/png");
    expect(dbMocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "GUIDE_IMAGE_UPLOADED", entityId: 71 }));
    await expect(learningRouter.createCaller(context("manager")).uploadGuideImage({ filename: "paso.png", contentType: "image/png", altText: "Pantalla de ejemplo", base64Data: "data:image/png;base64,iVBORw0KGgo=" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
