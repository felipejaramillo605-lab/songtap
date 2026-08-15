// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ auth: { me: { invalidate: vi.fn() } } }), auth: { loginPassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, registerPassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, forgotPassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, resetPassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } } }));
vi.mock("wouter", () => ({ useLocation: () => ["/login", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import Login from "./Login";

describe("Login", () => {
  afterEach(() => cleanup());

  it("explica que las cuentas beta deben usar el acceso local", () => {
    render(<Login />);
    const notice = screen.getByRole("note", { name: "Acceso para cuentas beta" });
    expect(notice.textContent).toContain("Correo y Contraseña");
    expect(notice.textContent).toContain("No uses Manus OAuth");
  });
});
