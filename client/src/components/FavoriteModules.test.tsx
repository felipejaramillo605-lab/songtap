// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ toggleFavorite: vi.fn(), invalidate: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ users: { favoriteModules: { invalidate: mocks.invalidate } } }),
    users: {
      favoriteModules: { useQuery: () => ({ data: [{ key: "manager.menu", label: "Menú", href: "/manager/menu", isFavorite: false }, { key: "manager.finance", label: "Finanzas", href: "/manager/finance", isFavorite: true }], isLoading: false }) },
      setFavoriteModule: { useMutation: (options?: { onSuccess?: () => void }) => ({ mutate: (input: { moduleKey: string; isFavorite: boolean }) => { mocks.toggleFavorite(input); options?.onSuccess?.(); }, isPending: false }) },
    },
  },
}));

import FavoriteModules from "./FavoriteModules";

describe("FavoriteModules", () => {
  afterEach(() => { cleanup(); mocks.toggleFavorite.mockReset(); mocks.invalidate.mockReset(); });

  it("permite fijar un módulo disponible y quitar un favorito desde el panel", () => {
    render(<FavoriteModules role="manager" />);
    expect(screen.getByText("Finanzas")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Personalizar" }));
    fireEvent.click(screen.getByRole("button", { name: "Fijar · Menú" }));
    expect(mocks.toggleFavorite).toHaveBeenCalledWith({ moduleKey: "manager.menu", isFavorite: true });

    fireEvent.click(screen.getByRole("button", { name: "Quitar Finanzas de favoritos" }));
    expect(mocks.toggleFavorite).toHaveBeenCalledWith({ moduleKey: "manager.finance", isFavorite: false });
    expect(mocks.invalidate).toHaveBeenCalled();
  });
});
