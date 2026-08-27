// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ logout: vi.fn(), venues: [] as { id: number; name: string }[], loginOptions: null as any, auth: { user: null as { id: number; email: string; name: string; role: string; venueId?: number | null; lastSignedIn?: Date | string } | null, isAuthenticated: false } }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ ...mocks.auth, logout: mocks.logout }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ auth: { me: { invalidate: vi.fn() } } }), venues: { list: { useQuery: () => ({ data: mocks.venues }) } }, auth: { loginPassword: { useMutation: (options: any) => { mocks.loginOptions = options; return { mutate: vi.fn(), isPending: false }; } }, registerPassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, forgotPassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, resetPassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } } }));
vi.mock("wouter", () => ({ useLocation: () => ["/login", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import Login from "./Login";

describe("Login", () => {
  afterEach(() => { cleanup(); mocks.logout.mockReset(); mocks.venues = []; mocks.loginOptions = null; mocks.auth.user = null; mocks.auth.isAuthenticated = false; });

  it("explica que las cuentas beta deben usar el acceso local", () => {
    render(<Login />);
    const notice = screen.getByRole("note", { name: "Acceso para cuentas beta" });
    expect(notice.textContent).toContain("Correo y Contraseña");
    expect(notice.textContent).toContain("No uses Manus OAuth");
  });

  it("abre el formulario local y el flujo de recuperación desde los controles visibles", () => {
    render(<Login />);
    fireEvent.click(screen.getByRole("button", { name: "Correo y Contraseña" }));
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    expect(screen.getByRole("button", { name: "Enviar enlace de recuperación" })).toBeTruthy();
  });

  it("muestra un aviso empático y accesible cuando el acceso se bloquea temporalmente", () => {
    render(<Login />);
    fireEvent.click(screen.getByRole("button", { name: "Correo y Contraseña" }));
    act(() => mocks.loginOptions.onError({ message: "Para cuidar la seguridad de tu cuenta, pausamos temporalmente los intentos de acceso. Podrás intentarlo de nuevo en aproximadamente 15 minutos." }));
    expect(screen.getByRole("alert").textContent).toContain("cuidar la seguridad de tu cuenta");
    expect(screen.getByRole("alert").textContent).toContain("15 minutos");
  });

  it("permite cerrar una sesión existente para ingresar con otra cuenta", async () => {
    mocks.auth.user = { id: 7, email: "activa@songtap.test", name: "Activa", role: "manager", venueId: 30001, lastSignedIn: "2026-08-16T01:15:00.000Z" };
    mocks.auth.isAuthenticated = true;
    mocks.venues = [{ id: 30001, name: "Bar La Noche" }];
    render(<Login />);
    expect(screen.getByRole("status").textContent).toContain("activa@songtap.test");
    expect(screen.getByRole("status").textContent).toContain("Rol: Manager");
    expect(screen.getByRole("status").textContent).toContain("Organización: Bar La Noche");
    expect(screen.getByRole("status").textContent).toContain("Última sesión:");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión y cambiar de cuenta" }));
    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });
});
