// @vitest-environment jsdom
import React, { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  recordDenied: vi.fn(),
  requestAccess: vi.fn(),
  auth: { user: null as { role: string; mustChangePassword?: boolean; email?: string } | null, isAuthenticated: false, loading: false },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ ...mocks.auth, logout: vi.fn() }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/owner", mocks.navigate], Route: () => null, Switch: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    access: {
      recordDenied: { useMutation: () => ({ mutate: mocks.recordDenied }) },
      request: { useMutation: () => ({ mutate: mocks.requestAccess, isPending: false }) },
    },
  },
}));

import { RoleGate } from "./App";

describe("RoleGate", () => {
  afterEach(() => { cleanup(); mocks.navigate.mockReset(); mocks.recordDenied.mockReset(); mocks.requestAccess.mockReset(); mocks.auth = { user: null, isAuthenticated: false, loading: false }; });

  it("explica que un acceso sin sesión no puede mostrar contenido interno", () => {
    render(<RoleGate allowedRoles={["owner"]}><p>Panel confidencial</p></RoleGate>);
    expect(screen.queryByText("Panel confidencial")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("Necesitas iniciar sesión");
    expect(screen.getByRole("button", { name: "Ir a iniciar sesión" })).toBeTruthy();
  });

  it("explica a un Staff por qué no puede abrir el panel Owner", () => {
    mocks.auth = { user: { role: "staff", email: "staff@songtap.test" }, isAuthenticated: true, loading: false };
    render(<RoleGate allowedRoles={["owner"]}><p>Panel confidencial</p></RoleGate>);
    expect(screen.queryByText("Panel confidencial")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("Tu rol actual no cuenta con permisos");
    expect(screen.getByText("Staff")).toBeTruthy();
    expect(screen.getByText("Panel Owner")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ir a mi panel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Solicitar acceso al Owner" })).toBeTruthy();
    expect(mocks.recordDenied).toHaveBeenCalledWith({ path: "/owner", reason: "role" });
  });

  it("permite renderizar el panel correspondiente al rol autorizado", () => {
    mocks.auth = { user: { role: "manager" }, isAuthenticated: true, loading: false };
    render(<RoleGate allowedRoles={["manager"]}><p>Panel Manager</p></RoleGate>);
    expect(screen.getByText("Panel Manager")).toBeTruthy();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("mantiene montado el panel autorizado cuando cambia el estado de autenticación", () => {
    mocks.auth = { user: { role: "owner" }, isAuthenticated: true, loading: false };
    const onMount = vi.fn();
    function MountProbe() {
      useEffect(() => { onMount(); }, []);
      return <p>Panel estable</p>;
    }
    const view = render(<RoleGate allowedRoles={["owner"]}><MountProbe /></RoleGate>);
    view.rerender(<RoleGate allowedRoles={["owner"]}><MountProbe /></RoleGate>);

    expect(screen.getByText("Panel estable")).toBeTruthy();
    expect(onMount).toHaveBeenCalledTimes(1);
  });
});
