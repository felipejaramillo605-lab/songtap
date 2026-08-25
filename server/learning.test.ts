import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ createAuditLog: vi.fn() }));
const learningMocks = vi.hoisted(() => ({
  createManagedGuideContent: vi.fn(),
  deleteManagedGuideContent: vi.fn(),
  getManagedGuideContents: vi.fn(),
  searchGuideContentSuggestions: vi.fn(),
  updateManagedGuideContent: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./guideContentDb", () => learningMocks);

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
});
