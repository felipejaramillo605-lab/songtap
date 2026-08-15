// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  orders: [] as any[],
  refetch: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 4, role: "staff", venueId: 7 }, isAuthenticated: true, loading: false }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ users: { favoriteModules: { invalidate: vi.fn() } } }), users: { favoriteModules: { useQuery: () => ({ data: [], isLoading: false }) }, setFavoriteModule: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } }, orders: { getByVenue: { useQuery: () => ({ data: mocks.orders, refetch: mocks.refetch, isFetching: false, dataUpdatedAt: new Date("2026-08-15T18:00:00.000Z").getTime(), error: null }) }, updateStatus: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } } }));
vi.mock("@/components/SongTapLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/OrderStatusTimeline", () => ({ default: () => <div>Historial</div> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>, CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3> }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3> }));
vi.mock("@/const", () => ({ getLoginUrl: () => "/login" }));
vi.mock("wouter", () => ({ useLocation: () => ["/staff/orders", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { info: mocks.toastInfo, success: mocks.toastSuccess, error: mocks.toastError } }));

import StaffOrders from "./StaffOrders";

const order = { id: 101, tableId: 3, clientName: "Camila", status: "pending", totalAmount: "24000", createdAt: new Date("2026-08-15T18:00:00.000Z") };

describe("StaffOrders synchronization", () => {
  beforeEach(() => {
    mocks.orders = [order];
    mocks.refetch.mockReset().mockResolvedValue({ error: null });
    mocks.toastInfo.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
  });
  afterEach(() => cleanup());

  it("muestra la última sincronización, permite actualizar y anuncia pedidos nuevos", async () => {
    const view = render(<StaffOrders />);
    expect(screen.getByRole("status").textContent).toContain("Cola sincronizada");
    expect(screen.getByText(/Sincronizado/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /actualizar/i }));
    await waitFor(() => expect(mocks.refetch).toHaveBeenCalledTimes(1));

    mocks.orders = [order, { ...order, id: 102, clientName: "Luis" }];
    view.rerender(<StaffOrders />);
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Nuevo pedido #102"));
    expect(mocks.toastInfo).toHaveBeenCalledWith("Nuevo pedido #102 en la cola.");
  });
});
