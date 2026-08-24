// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ logout: vi.fn(), navigate: vi.fn(), location: "/manager" }));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Manager temporal", email: "manager@example.com" },
    logout: mocks.logout,
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    notifications: {
      getPendingCount: { useQuery: () => ({ data: 0 }) },
      getSettings: { useQuery: () => ({ data: null }) },
      getMyUnreadCount: { useQuery: () => ({ data: 0 }) },
    },
  },
}));

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a>,
  useLocation: () => [mocks.location, mocks.navigate],
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import SongTapLayout from "./SongTapLayout";

describe("SongTapLayout", () => {
  beforeEach(() => { mocks.logout.mockReset(); mocks.navigate.mockReset(); mocks.location = "/manager"; });
  afterEach(() => cleanup());

  it("ejecuta logout al pulsar el botón visible Salir", async () => {
    const user = userEvent.setup();
    render(<SongTapLayout role="manager"><div>Contenido protegido</div></SongTapLayout>);

    await user.click(screen.getAllByRole("button", { name: "Salir" })[0]);

    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });

  it("muestra Regresar en una pantalla interna y vuelve al panel si no hay historial", async () => {
    const user = userEvent.setup();
    mocks.location = "/manager/menu";
    Object.defineProperty(window.history, "length", { configurable: true, value: 1 });
    render(<SongTapLayout role="manager" title="Menú"><div>Menú</div></SongTapLayout>);

    await user.click(screen.getByRole("button", { name: "Regresar a la pantalla anterior" }));

    expect(mocks.navigate).toHaveBeenCalledWith("/manager");
  });

  it("muestra migas de pan accesibles en las pantallas internas", () => {
    mocks.location = "/manager/menu";
    render(<SongTapLayout role="manager" title="Gestión de menú"><div>Menú</div></SongTapLayout>);

    const breadcrumbs = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(breadcrumbs).toBeTruthy();
    expect(screen.getByRole("link", { name: "Panel Manager" }).getAttribute("href")).toBe("/manager");
    expect(within(breadcrumbs).getByText("Menú")).toBeTruthy();
  });
});
