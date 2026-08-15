// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/", mocks.navigate] }));

import Home from "./Home";

describe("Home", () => {
  afterEach(() => { cleanup(); mocks.navigate.mockReset(); });

  it("usa enlaces directos al formulario local en vez de OAuth", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: "Acceder al panel" }).getAttribute("href")).toBe("/login");
  });
});
