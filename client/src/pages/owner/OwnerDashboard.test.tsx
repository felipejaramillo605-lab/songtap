// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ analyticsInputs: [] as any[] }));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, name: "Felipe", role: "owner" }, isAuthenticated: true, loading: false }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    venues: { list: { useQuery: () => ({ data: [{ id: 7, name: "Bar Central", address: "Calle 1", isActive: true, musicMode: "manual" }] }) } },
    users: { list: { useQuery: () => ({ data: [{ id: 1, role: "owner" }, { id: 2, role: "manager" }, { id: 3, role: "staff" }] }) } },
    finance: {
      ownerVenueAnalytics: { useQuery: (input: unknown) => {
        mocks.analyticsInputs.push(input);
        return { data: { totals: { revenue: 150000, orderCount: 15, averageTicket: 10000 }, dailyRevenue: [{ date: "2026-08-15", revenue: 150000, orderCount: 15 }], venues: [{ venueId: 7, venueName: "Bar Central", isActive: true, revenue: 150000, orderCount: 15, averageTicket: 10000 }] }, isLoading: false };
      } },
    },
    pqrs: {
      ownerAnalytics: { useQuery: () => ({ data: { totals: { total: 10, open: 2, inReview: 3, resolved: 5, resolutionRate: 50 }, venues: [{ venueId: 7, venueName: "Bar Central", total: 10, open: 2, inReview: 3, resolved: 5, resolutionRate: 50, averageResponseMinutes: 42 }] }, isLoading: false }) },
    },
  },
}));
vi.mock("@/components/SongTapLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>, CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3> }));
vi.mock("@/const", () => ({ getLoginUrl: () => "/login" }));
vi.mock("wouter", () => ({ useLocation: () => ["/owner", vi.fn()] }));
vi.mock("recharts", () => ({ ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, Bar: () => null, CartesianGrid: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null }));

import OwnerDashboard from "./OwnerDashboard";

describe("OwnerDashboard analytics", () => {
  beforeEach(() => { mocks.analyticsInputs = []; });
  afterEach(() => cleanup());

  it("muestra métricas y ranking interlocal, y permite ampliar el periodo", () => {
    render(<OwnerDashboard />);

    expect(screen.getByText("Analítica interlocal")).toBeTruthy();
    expect(screen.getAllByText("Bar Central").length).toBeGreaterThan(0);
    expect(screen.getByText("Ingresos del periodo")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Gráfico de barras de ingresos diarios interlocales" })).toBeTruthy();
    expect(screen.getByText("Resumen diario en tabla")).toBeTruthy();
    expect(screen.getByText("Desempeño PQRS por local")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Tasa de resolución de Bar Central: 50%" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Periodo de analítica interlocal"), { target: { value: "30" } });
    expect(mocks.analyticsInputs).toHaveLength(2);
    expect((mocks.analyticsInputs[1] as { dateFrom: Date }).dateFrom).toBeInstanceOf(Date);
  });
});
