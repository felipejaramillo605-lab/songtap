// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), invalidate: vi.fn(), navigate: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 2, role: "staff", mustChangePassword: true }, isAuthenticated: true, loading: false }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ auth: { me: { invalidate: mocks.invalidate } } }), users: { completeTemporaryPassword: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) } } } }));
vi.mock("wouter", () => ({ useLocation: () => ["/change-password", mocks.navigate] }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import ForcePasswordChange from "./ForcePasswordChange";

describe("ForcePasswordChange", () => {
  afterEach(() => { cleanup(); mocks.mutate.mockReset(); mocks.invalidate.mockReset(); mocks.navigate.mockReset(); });

  it("exige una contraseña confirmada antes de permitir continuar", () => {
    render(<ForcePasswordChange />);
    expect(screen.getByText("Crea tu contraseña personal")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "NuevaClaveBeta!26" } });
    fireEvent.change(screen.getByLabelText("Confirmar nueva contraseña"), { target: { value: "OtraClaveBeta!26" } });
    expect(screen.getByRole("alert").textContent).toContain("no coinciden");
    fireEvent.change(screen.getByLabelText("Confirmar nueva contraseña"), { target: { value: "NuevaClaveBeta!26" } });
    fireEvent.submit(screen.getByRole("button", { name: "Guardar y continuar" }).closest("form")!);
    expect(mocks.mutate).toHaveBeenCalledWith({ newPassword: "NuevaClaveBeta!26" });
  });
});
