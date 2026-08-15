// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  refetchHistory: vi.fn(),
  refetchUnreadCount: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  history: [] as unknown[],
  unreadCount: 0,
  isFetching: false,
  historyQueryOptions: undefined as { refetchInterval?: number; refetchIntervalInBackground?: boolean } | undefined,
  unreadCountQueryOptions: undefined as { refetchInterval?: number; refetchIntervalInBackground?: boolean } | undefined,
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "owner" }, isAuthenticated: true, loading: false }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ notifications: { getSettings: { invalidate: vi.fn() }, getHistory: { invalidate: vi.fn() }, getUnreadCount: { invalidate: vi.fn() } } }),
    notifications: {
      getSettings: { useQuery: () => ({ data: { enabled: true, emailNotifications: true, soundType: "chime" }, isLoading: false }) },
      getHistory: {
        useQuery: (_input: unknown, options: { refetchInterval?: number; refetchIntervalInBackground?: boolean }) => {
          mocks.historyQueryOptions = options;
          return { data: mocks.history, isLoading: false, isFetching: mocks.isFetching, dataUpdatedAt: 1760000000000, refetch: mocks.refetchHistory };
        },
      },
      getUnreadCount: {
        useQuery: (_input: unknown, options: { refetchInterval?: number; refetchIntervalInBackground?: boolean }) => {
          mocks.unreadCountQueryOptions = options;
          return { data: mocks.unreadCount, isFetching: mocks.isFetching, dataUpdatedAt: 1760000000000, refetch: mocks.refetchUnreadCount };
        },
      },
      updateSettings: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      markRead: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      markAllRead: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));
vi.mock("@/components/SongTapLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label> }));
vi.mock("@/components/ui/switch", () => ({ Switch: ({ checked, onCheckedChange, ...props }: { checked: boolean; onCheckedChange: (value: boolean) => void }) => <button type="button" aria-pressed={checked} onClick={() => onCheckedChange(!checked)} {...props} /> }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));
vi.mock("@/const", () => ({ getLoginUrl: () => "/login" }));
vi.mock("wouter", () => ({ useLocation: () => ["/owner/notifications", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError, info: mocks.toastInfo } }));

import OwnerNotificationsSettings from "./OwnerNotificationsSettings";

describe("OwnerNotificationsSettings refresh", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    mocks.history = [];
    mocks.unreadCount = 0;
    mocks.isFetching = false;
    mocks.historyQueryOptions = undefined;
    mocks.unreadCountQueryOptions = undefined;
    mocks.refetchHistory.mockReset().mockResolvedValue({ data: [] });
    mocks.refetchUnreadCount.mockReset().mockResolvedValue({ data: 0 });
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.toastInfo.mockReset();
  });

  it("consulta el historial automáticamente, muestra el estado de actualización y avisa nuevas alertas", async () => {
    const { rerender } = render(<OwnerNotificationsSettings />);

    expect(mocks.historyQueryOptions).toMatchObject({ refetchInterval: 10000, refetchIntervalInBackground: false });
    expect(mocks.unreadCountQueryOptions).toMatchObject({ refetchInterval: 10000, refetchIntervalInBackground: false });

    mocks.isFetching = true;
    mocks.unreadCount = 2;
    rerender(<OwnerNotificationsSettings />);

    await waitFor(() => expect(mocks.toastInfo).toHaveBeenCalledWith("Hay 2 nuevas alertas en el historial."));
    expect(screen.getByText("Actualizando alertas...")).toBeTruthy();
    expect(screen.getByRole("button", { name: /actualizar historial de notificaciones ahora/i }).hasAttribute("disabled")).toBe(true);
  });

  it("permite actualizar manualmente ambas consultas del historial", async () => {
    render(<OwnerNotificationsSettings />);
    fireEvent.click(screen.getByRole("button", { name: /actualizar historial de notificaciones ahora/i }));

    await waitFor(() => {
      expect(mocks.refetchHistory).toHaveBeenCalledTimes(1);
      expect(mocks.refetchUnreadCount).toHaveBeenCalledTimes(1);
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Historial de notificaciones actualizado.");
    });
  });

  it("muestra un error visible y no confirma éxito cuando la recarga falla", async () => {
    mocks.refetchHistory.mockResolvedValue({ data: [], error: new Error("Sin conexión") });
    render(<OwnerNotificationsSettings />);
    fireEvent.click(screen.getByRole("button", { name: /actualizar historial de notificaciones ahora/i }));

    const expectedMessage = "No se pudo actualizar el historial. Revisa tu conexión e inténtalo de nuevo.";
    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(expectedMessage);
      expect(screen.getByRole("alert").textContent).toContain(expectedMessage);
    });
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });
});
