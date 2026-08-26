// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ create: vi.fn(), uploadImage: vi.fn(), invalidate: vi.fn(), contents: [] as any[], media: [] as any[], misses: [] as any[], resolutionStats: { totalResolutions: 0, uniqueQueries: 0, articlesWithResolutions: 0, lastResolvedAt: null as Date | null, articles: [] as any[] } }));

vi.mock("@/components/SongTapLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ learning: { adminList: { invalidate: mocks.invalidate }, adminMedia: { invalidate: mocks.invalidate } } }),
    learning: {
      adminList: { useQuery: () => ({ data: mocks.contents, isLoading: false }) },
      adminMedia: { useQuery: () => ({ data: mocks.media }) },
      adminSearchMisses: { useQuery: () => ({ data: mocks.misses }) },
      adminResolutionStats: { useQuery: () => ({ data: mocks.resolutionStats }) },
      adminCreate: { useMutation: (options?: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { mocks.create(input); options?.onSuccess?.(); }, isPending: false }) },
      adminUpdate: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      adminDelete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      uploadGuideImage: { useMutation: (options?: { onSuccess?: () => void }) => ({ mutateAsync: async (input: unknown) => { mocks.uploadImage(input); options?.onSuccess?.(); return { id: 7, url: "/manus-storage/guides/example.png", altText: "Ejemplo" }; }, isPending: false }) },
    },
  },
}));

import OwnerGuideContent from "./OwnerGuideContent";

describe("OwnerGuideContent", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.contents = []; mocks.media = []; mocks.misses = []; });

  it("permite al Owner crear un tutorial administrado con audiencia y ruta interna", async () => {
    const user = userEvent.setup();
    render(<OwnerGuideContent />);
    await user.click(screen.getByRole("button", { name: "Agregar contenido" }));
    await user.type(screen.getByLabelText("Categoría"), "Inventario");
    await user.type(screen.getByLabelText("Título"), "Recepción segura");
    await user.type(screen.getByLabelText("Resumen"), "Aprende a revisar una recepción de inventario antes de confirmar la compra.");
    await user.type(screen.getByLabelText("Contenido enriquecido"), "Confirma proveedor. Revisa cantidades. Registra los lotes.");
    await user.type(screen.getByLabelText("Ruta interna (opcional)"), "/manager/inventory");
    await user.click(screen.getByRole("button", { name: "Crear contenido" }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ slug: "recepcion-segura", roles: ["manager"], modulePath: "/manager/inventory" }));
    expect(mocks.invalidate).toHaveBeenCalledTimes(1);
  });

  it("aplica una plantilla visual de solución rápida al formulario", async () => {
    const user = userEvent.setup();
    render(<OwnerGuideContent />);
    await user.click(screen.getByRole("button", { name: "Agregar contenido" }));
    await user.click(screen.getByText("Solución rápida"));
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("Solución: [problema frecuente]");
    expect((screen.getByLabelText("Categoría") as HTMLInputElement).value).toBe("Ayuda");
    expect((screen.getByLabelText("Contenido enriquecido") as HTMLTextAreaElement).value).toContain("Cómo resolverlo");
  });

  it("muestra el artículo con más aperturas desde búsquedas en el panel de impacto", () => {
    mocks.resolutionStats = { totalResolutions: 9, uniqueQueries: 3, articlesWithResolutions: 1, lastResolvedAt: new Date(), articles: [{ guideContentId: 74, title: "Recibir compras", category: "Inventario", resolutionCount: 9, queryCount: 3, lastResolvedAt: new Date() }] };
    render(<OwnerGuideContent />);
    expect(screen.getByText("Impacto de la ayuda")).toBeTruthy();
    expect(screen.getByText("Recibir compras")).toBeTruthy();
    expect(screen.getByText("9 aperturas")).toBeTruthy();
  });
});
