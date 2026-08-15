// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ analyticsInputs: [] as any[], pqrsInputs: [] as any[], writeFileXLSX: vi.fn(), upsertSlaTarget: vi.fn(), invalidateSlaTargets: vi.fn(), invalidateOwnerAnalytics: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, name: "Felipe", role: "owner" }, isAuthenticated: true, loading: false }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ pqrs: { slaTargets: { invalidate: mocks.invalidateSlaTargets }, ownerAnalytics: { invalidate: mocks.invalidateOwnerAnalytics } } }),
    venues: { list: { useQuery: () => ({ data: [{ id: 7, name: "Bar Central", address: "Calle 1", isActive: true, musicMode: "manual" }] }) } },
    users: { list: { useQuery: () => ({ data: [{ id: 1, role: "owner" }, { id: 2, role: "manager" }, { id: 3, role: "staff" }] }) } },
    finance: {
      ownerVenueAnalytics: { useQuery: (input: unknown) => {
        mocks.analyticsInputs.push(input);
        return { data: { totals: { revenue: 150000, orderCount: 15, averageTicket: 10000 }, dailyRevenue: [{ date: "2026-08-15", revenue: 150000, orderCount: 15 }], venues: [{ venueId: 7, venueName: "Bar Central", isActive: true, revenue: 150000, orderCount: 15, averageTicket: 10000 }] }, isLoading: false };
      } },
    },
    pqrs: {
      ownerAnalytics: { useQuery: (input: unknown) => { mocks.pqrsInputs.push(input); return { data: { totals: { total: 14, open: 3, inReview: 3, resolved: 8, resolutionRate: 57, slaEvaluated: 10, slaMet: 7, slaBreached: 3, slaComplianceRate: 70 }, venues: [{ venueId: 7, venueName: "Bar Central", total: 10, open: 2, inReview: 3, resolved: 5, resolutionRate: 50, averageResponseMinutes: 42, slaEvaluated: 8, slaMet: 6, slaBreached: 2, slaComplianceRate: 75 }, { venueId: 8, venueName: "Bar Norte", total: 4, open: 1, inReview: 0, resolved: 3, resolutionRate: 75, averageResponseMinutes: 15, slaEvaluated: 2, slaMet: 1, slaBreached: 1, slaComplianceRate: 50 }] }, isLoading: false }; } },
      slaTargets: { useQuery: () => ({ data: [{ venueId: 7, type: "complaint", targetMinutes: 240 }] }) },
      upsertSlaTarget: { useMutation: (options?: { onSuccess?: (result: { success: boolean }, variables: { venueId: number; type: string; targetMinutes: number }) => void }) => ({ mutate: (input: { venueId: number; type: string; targetMinutes: number }) => { mocks.upsertSlaTarget(input); options?.onSuccess?.({ success: true }, input); }, isPending: false, isSuccess: true, error: null }) },
    },
  },
}));
vi.mock("@/components/SongTapLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>, CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3> }));
vi.mock("@/const", () => ({ getLoginUrl: () => "/login" }));
vi.mock("wouter", () => ({ useLocation: () => ["/owner", vi.fn()] }));
vi.mock("recharts", () => ({ ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, Bar: () => null, CartesianGrid: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null }));
vi.mock("xlsx", async () => ({ ...(await vi.importActual<typeof import("xlsx")>("xlsx")), writeFileXLSX: mocks.writeFileXLSX }));

import OwnerDashboard from "./OwnerDashboard";

describe("OwnerDashboard analytics", () => {
  beforeEach(() => { mocks.analyticsInputs = []; mocks.pqrsInputs = []; mocks.writeFileXLSX.mockReset(); mocks.upsertSlaTarget.mockReset(); mocks.invalidateSlaTargets.mockReset(); mocks.invalidateOwnerAnalytics.mockReset(); });
  afterEach(() => cleanup());

  it("muestra métricas y ranking interlocal, filtra sucursales y exporta PQRS", async () => {
    render(<OwnerDashboard />);

    expect(screen.getByText("Analítica interlocal")).toBeTruthy();
    expect(screen.getAllByText("Bar Central").length).toBeGreaterThan(0);
    expect(screen.getByText("Ingresos del periodo")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Gráfico de barras de ingresos diarios interlocales" })).toBeTruthy();
    expect(screen.getByText("Resumen diario en tabla")).toBeTruthy();
    expect(screen.getByText("Desempeño PQRS por local")).toBeTruthy();
    expect(screen.getByText("Comparación SLA frente al periodo anterior")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Tasa de resolución de Bar Central: 50%" })).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Cumplimiento SLA de Bar Central: 75%" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Minutos objetivo SLA"), { target: { value: "180" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar SLA" }));
    expect(mocks.upsertSlaTarget).toHaveBeenCalledWith({ venueId: 7, type: "complaint", targetMinutes: 180 });
    expect(mocks.invalidateSlaTargets).toHaveBeenCalledOnce();
    expect(mocks.invalidateOwnerAnalytics).toHaveBeenCalledOnce();
    expect((screen.getByLabelText("Minutos objetivo SLA") as HTMLInputElement).value).toBe("180");
    expect(screen.getByRole("status").textContent).toContain("Objetivo SLA guardado");

    fireEvent.change(screen.getByLabelText("Periodo de analítica interlocal"), { target: { value: "30" } });
    expect(mocks.analyticsInputs.length).toBeGreaterThanOrEqual(2);
    expect((mocks.analyticsInputs.at(-1) as { dateFrom: Date }).dateFrom).toBeInstanceOf(Date);
    expect(mocks.pqrsInputs.some((input) => (input as { dateTo: Date }).dateTo < new Date())).toBe(true);

    fireEvent.change(screen.getByLabelText("Filtrar PQRS por tipo"), { target: { value: "complaint" } });
    fireEvent.change(screen.getByLabelText("Filtrar PQRS por estado"), { target: { value: "resolved" } });
    expect(mocks.pqrsInputs.at(-1)).toMatchObject({ type: "complaint", status: "resolved" });

    fireEvent.click(screen.getByRole("checkbox", { name: "Usar rango de fechas personalizado para PQRS" }));
    fireEvent.change(screen.getByLabelText("Fecha inicial personalizada de PQRS"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("Fecha final personalizada de PQRS"), { target: { value: "2026-08-10" } });
    expect(mocks.pqrsInputs.find((input) => (input as { dateFrom: Date; dateTo: Date }).dateFrom.getTime() === new Date("2026-08-01T00:00:00").getTime() && (input as { dateTo: Date }).dateTo.getTime() === new Date("2026-08-10T23:59:59.999").getTime())).toMatchObject({ type: "complaint", status: "resolved", dateFrom: new Date("2026-08-01T00:00:00"), dateTo: new Date("2026-08-10T23:59:59.999") });

    const createObjectUrl = vi.fn((_: Blob) => "blob:pqrs");
    const revokeObjectUrl = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole("checkbox", { name: "Incluir sucursal Bar Central" }));
    expect((screen.getByRole("checkbox", { name: "Incluir sucursal Bar Central" }) as HTMLInputElement).checked).toBe(false);
    const comparisonTable = screen.getByRole("table", { name: "Indicadores de desempeño de PQRS por sucursal seleccionada para el periodo activo." });
    expect(within(comparisonTable).getAllByRole("row")).toHaveLength(2);
    expect(within(comparisonTable).getByRole("rowheader", { name: "Bar Norte" })).toBeTruthy();
    expect(within(comparisonTable).getByText("4")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Descargar comparativo PQRS en CSV" }));
    expect(createObjectUrl).toHaveBeenCalledOnce();
    const [csvBlob] = createObjectUrl.mock.calls[0]!;
    expect(await csvBlob.text()).toContain("Bar Norte");
    expect(await csvBlob.text()).not.toContain("Bar Central");
    expect(await csvBlob.text()).toContain("Queja");
    expect(await csvBlob.text()).toContain("Resuelta");
    expect(await csvBlob.text()).toContain("Periodo desde");
    expect(await csvBlob.text()).toContain("2026-08-01");
    expect(await csvBlob.text()).toContain("Periodo hasta");
    expect(await csvBlob.text()).toContain("2026-08-10");
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:pqrs");
    fireEvent.click(screen.getByRole("button", { name: "Descargar comparativo PQRS en Excel" }));
    expect(mocks.writeFileXLSX).toHaveBeenCalledWith(expect.anything(), expect.stringMatching(/^songtap-desempeno-pqrs-.*\.xlsx$/));

    fireEvent.change(screen.getByLabelText("Fecha inicial personalizada de PQRS"), { target: { value: "2026-08-20" } });
    expect(screen.getByRole("alert").textContent).toContain("La fecha inicial debe ser anterior o igual a la fecha final.");
    expect((screen.getByRole("button", { name: "Descargar comparativo PQRS en CSV" }) as HTMLButtonElement).disabled).toBe(true);
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
