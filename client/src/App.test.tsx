// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), auth: { user: null as { role: string; mustChangePassword?: boolean } | null, isAuthenticated: false, loading: false } }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ ...mocks.auth }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/owner", mocks.navigate], Route: () => null, Switch: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { RoleGate } from "./App";

describe("RoleGate", () => {
  afterEach(() => { cleanup(); mocks.navigate.mockReset(); mocks.auth = { user: null, isAuthenticated: false, loading: false }; });

  it("redirige un acceso sin sesión al Login sin renderizar contenido interno", () => {
    render(<RoleGate allowedRoles={["owner"]}><p>Panel confidencial</p></RoleGate>);
    expect(screen.queryByText("Panel confidencial")).toBeNull();
    expect(mocks.navigate).toHaveBeenCalledWith("/login");
  });

  it("redirige a un Staff fuera del panel Owner hacia su panel seguro", () => {
    mocks.auth = { user: { role: "staff" }, isAuthenticated: true, loading: false };
    render(<RoleGate allowedRoles={["owner"]}><p>Panel confidencial</p></RoleGate>);
    expect(screen.queryByText("Panel confidencial")).toBeNull();
    expect(mocks.navigate).toHaveBeenCalledWith("/staff");
  });

  it("permite renderizar el panel correspondiente al rol autorizado", () => {
    mocks.auth = { user: { role: "manager" }, isAuthenticated: true, loading: false };
    render(<RoleGate allowedRoles={["manager"]}><p>Panel Manager</p></RoleGate>);
    expect(screen.getByText("Panel Manager")).toBeTruthy();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
