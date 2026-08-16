// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ logout: vi.fn(), venues: [] as { id: number; name: string }[], auth: { user: null as { id: number; email: string; name: string; role: string; venueId?: number | null } | null, isAuthenticated: false } }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ ...mocks.auth, logout: mocks.logout }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ auth: { me: { invalidate: vi.fn() } } }), venues: { list: { useQuery: () => ({ data: mocks.venues }) } }, auth: { loginPassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, registerPassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, forgotPassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, resetPassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } } }));
vi.mock("wouter", () => ({ useLocation: () => ["/login", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import Login from "./Login";

describe("Login", () => {
  afterEach(() => { cleanup(); mocks.logout.mockReset(); mocks.venues = []; mocks.auth.user = null; mocks.auth.isAuthenticated = false; });

  it("explica que las cuentas beta deben usar el acceso local", () => {
    render(<Login />);
    const notice = screen.getByRole("note", { name: "Acceso para cuentas beta" });
    expect(notice.textContent).toContain("Correo y Contraseña");
    expect(notice.textContent).toContain("No uses Manus OAuth");
  });

  it("permite cerrar una sesión existente para ingresar con otra cuenta", async () => {
    mocks.auth.user = { id: 7, email: "activa@songtap.test", name: "Activa", role: "manager", venueId: 30001 };
    mocks.auth.isAuthenticated = true;
    mocks.venues = [{ id: 30001, name: "Bar La Noche" }];
    render(<Login />);
    expect(screen.getByRole("status").textContent).toContain("activa@songtap.test");
    expect(screen.getByRole("status").textContent).toContain("Rol: Manager");
    expect(screen.getByRole("status").textContent).toContain("Organización: Bar La Noche");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión y cambiar de cuenta" }));
    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });
});
