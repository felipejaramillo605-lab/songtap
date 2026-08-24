// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ markOpened: vi.fn(), reportIssue: vi.fn(), complete: vi.fn(), reset: vi.fn(), navigate: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ onboarding: { getProgress: { invalidate: vi.fn() }, listSupportTickets: { invalidate: vi.fn() } }, notifications: { getPendingCount: { invalidate: vi.fn() } } }),
    onboarding: {
      getProgress: { useQuery: () => ({ data: null, isLoading: false }) },
      listSupportTickets: { useQuery: () => ({ data: [] }) },
      markOpened: { useMutation: () => ({ mutate: mocks.markOpened }) },
      complete: { useMutation: () => ({ mutate: mocks.complete, isPending: false }) },
      reset: { useMutation: () => ({ mutate: mocks.reset, isPending: false }) },
      reportIssue: { useMutation: () => ({ mutate: mocks.reportIssue, isPending: false }) },
    },
  },
}));
vi.mock("wouter", () => ({ useLocation: () => ["/owner", mocks.navigate] }));

import OnboardingCenter from "./OnboardingCenter";

describe("OnboardingCenter", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("abre el recorrido Owner pendiente y muestra una captura del botón principal", async () => {
    render(<OnboardingCenter role="owner" />);
    await screen.findByRole("dialog");
    expect(screen.getByRole("heading", { name: "Tu guía SongTap" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /captura del dashboard owner/i })).toBeTruthy();
    expect(screen.getAllByText("Generar reporte ahora", { exact: false }).length).toBeGreaterThan(0);
  });

  it("permite enviar una incidencia contextual desde la ayuda", async () => {
    const user = userEvent.setup();
    render(<OnboardingCenter role="staff" />);
    await screen.findByRole("dialog");
    expect(screen.getByRole("heading", { name: "Tu guía SongTap" })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Ayuda y errores" }));
    const titleInput = await screen.findByPlaceholderText("Ej.: No puedo marcar un pedido como entregado");
    const descriptionInput = await screen.findByPlaceholderText("Qué hiciste, qué esperabas y qué ocurrió…");
    fireEvent.change(titleInput, { target: { value: "No carga la cola" } });
    fireEvent.change(descriptionInput, { target: { value: "La vista de música permanece cargando después de actualizar la página." } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar incidencia" }));
    await waitFor(() => expect(mocks.reportIssue).toHaveBeenCalledWith({ route: "/owner", title: "No carga la cola", description: "La vista de música permanece cargando después de actualizar la página." }));
  });
});
