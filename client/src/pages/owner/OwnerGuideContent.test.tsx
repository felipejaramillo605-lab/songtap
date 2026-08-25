// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ create: vi.fn(), invalidate: vi.fn(), contents: [] as any[] }));

vi.mock("@/components/SongTapLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ learning: { adminList: { invalidate: mocks.invalidate } } }),
    learning: {
      adminList: { useQuery: () => ({ data: mocks.contents, isLoading: false }) },
      adminCreate: { useMutation: (options?: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { mocks.create(input); options?.onSuccess?.(); }, isPending: false }) },
      adminUpdate: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      adminDelete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

import OwnerGuideContent from "./OwnerGuideContent";

describe("OwnerGuideContent", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.contents = []; });

  it("permite al Owner crear un tutorial administrado con audiencia y ruta interna", async () => {
    const user = userEvent.setup();
    render(<OwnerGuideContent />);
    await user.click(screen.getByRole("button", { name: "Agregar contenido" }));
    await user.type(screen.getByLabelText("Categoría"), "Inventario");
    await user.type(screen.getByLabelText("Título"), "Recepción segura");
    await user.type(screen.getByLabelText("Resumen"), "Aprende a revisar una recepción de inventario antes de confirmar la compra.");
    await user.type(screen.getByLabelText("Contenido y pasos"), "Confirma proveedor. Revisa cantidades. Registra los lotes.");
    await user.type(screen.getByLabelText("Ruta interna (opcional)"), "/manager/inventory");
    await user.click(screen.getByRole("button", { name: "Crear contenido" }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ slug: "recepcion-segura", roles: ["manager"], modulePath: "/manager/inventory" }));
    expect(mocks.invalidate).toHaveBeenCalledTimes(1);
  });
});
