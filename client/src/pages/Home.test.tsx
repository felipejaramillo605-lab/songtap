// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/", mocks.navigate] }));

import Home from "./Home";

describe("Home", () => {
  afterEach(() => { cleanup(); mocks.navigate.mockReset(); });

  it("envía los accesos públicos al formulario local en vez de OAuth", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    fireEvent.click(screen.getByRole("button", { name: "Acceder al panel" }));
    expect(mocks.navigate).toHaveBeenNthCalledWith(1, "/login");
    expect(mocks.navigate).toHaveBeenNthCalledWith(2, "/login");
  });
});
