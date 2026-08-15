// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ resetBetaPassword: vi.fn(), refetchUsers: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, name: "Felipe", role: "owner" }, isAuthenticated: true, loading: false }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    users: {
      list: { useQuery: () => ({ data: [{ id: 1, name: "Felipe", email: "owner@example.com", role: "owner", venueId: null }, { id: 2, name: "Beta Manager", email: "manager.noche@songtap.test", role: "manager", venueId: 30001 }], refetch: mocks.refetchUsers }) },
      updateRole: { useMutation: () => ({ mutate: vi.fn() }) },
      resetBetaPassword: { useMutation: (options?: { onSuccess?: (result: { email: string; temporaryPassword: string }) => void }) => ({ mutate: (input: { userId: number }) => { mocks.resetBetaPassword(input); options?.onSuccess?.({ email: "manager.noche@songtap.test", temporaryPassword: "Beta!NuevaClaveTemporal26" }); }, isPending: false }) },
    },
    venues: { list: { useQuery: () => ({ data: [{ id: 30001, name: "Bar La Noche" }] }) } },
  },
}));
vi.mock("@/components/SongTapLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/const", () => ({ getLoginUrl: () => "/login" }));
vi.mock("wouter", () => ({ useLocation: () => ["/owner/users", vi.fn()] }));

import OwnerUsers from "./OwnerUsers";

describe("OwnerUsers beta password reset", () => {
  afterEach(() => { cleanup(); mocks.resetBetaPassword.mockReset(); mocks.refetchUsers.mockReset(); });

  it("solicita confirmación y muestra la nueva clave beta sólo tras restablecerla", () => {
    render(<OwnerUsers />);
    fireEvent.click(screen.getByRole("button", { name: "Restablecer clave" }));
    expect(screen.getByText("¿Restablecer contraseña beta?")).toBeTruthy();
    expect(screen.getAllByText("manager.noche@songtap.test").length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }));
    expect(mocks.resetBetaPassword).toHaveBeenCalledWith({ userId: 2 });
    expect(screen.getByRole("status").textContent).toContain("Beta!NuevaClaveTemporal26");

    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }));
    expect(screen.queryByText("Beta!NuevaClaveTemporal26")).toBeNull();
  });
});
