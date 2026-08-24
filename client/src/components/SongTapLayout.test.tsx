// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ logout: vi.fn(), navigate: vi.fn(), location: "/manager", unreadAccessDecisions: 0 }));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Manager temporal", email: "manager@example.com" },
    logout: mocks.logout,
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ onboarding: { getProgress: { invalidate: vi.fn() }, listSupportTickets: { invalidate: vi.fn() }, getHelpInteractions: { invalidate: vi.fn() } }, notifications: { getPendingCount: { invalidate: vi.fn() } } }),
    notifications: {
      getPendingCount: { useQuery: () => ({ data: 0 }) },
      getSettings: { useQuery: () => ({ data: null }) },
      getMyUnreadCount: { useQuery: () => ({ data: mocks.unreadAccessDecisions }) },
    },
    onboarding: {
      getProgress: { useQuery: () => ({ data: { completedAt: new Date(), autoShownAt: new Date(), suppressAutoOnboarding: true }, isSuccess: true }) },
      listSupportTickets: { useQuery: () => ({ data: [] }) },
      getHelpInteractions: { useQuery: () => ({ data: { votes: {}, favorites: [] } }) },
      markOpened: { useMutation: () => ({ mutate: vi.fn() }) },
      markAutoShown: { useMutation: () => ({ mutate: vi.fn() }) },
      setAutoSuppressed: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      complete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      reset: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      reportIssue: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      setHelpVote: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      toggleHelpFavorite: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
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
  beforeEach(() => { mocks.logout.mockReset(); mocks.navigate.mockReset(); mocks.location = "/manager"; mocks.unreadAccessDecisions = 0; });
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

  it("muestra un badge de decisiones no leídas junto a Mi Perfil", () => {
    mocks.unreadAccessDecisions = 3;
    render(<SongTapLayout role="manager"><div>Contenido protegido</div></SongTapLayout>);

    expect(screen.getAllByText("3", { exact: true }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /mi perfil/i }).some((link) => link.getAttribute("href") === "/profile")).toBe(true);
  });
});
