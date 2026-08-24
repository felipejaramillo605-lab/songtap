// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ markOpened: vi.fn(), reportIssue: vi.fn(), complete: vi.fn(), reset: vi.fn(), setHelpVote: vi.fn(), toggleHelpFavorite: vi.fn(), navigate: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ onboarding: { getProgress: { invalidate: vi.fn() }, listSupportTickets: { invalidate: vi.fn() }, getHelpInteractions: { invalidate: vi.fn() } }, notifications: { getPendingCount: { invalidate: vi.fn() } } }),
    onboarding: {
      getProgress: { useQuery: () => ({ data: null, isLoading: false }) },
      listSupportTickets: { useQuery: () => ({ data: [] }) },
      getHelpInteractions: { useQuery: () => ({ data: { votes: {}, favorites: [] } }) },
      markOpened: { useMutation: () => ({ mutate: mocks.markOpened }) },
      complete: { useMutation: () => ({ mutate: mocks.complete, isPending: false }) },
      reset: { useMutation: () => ({ mutate: mocks.reset, isPending: false }) },
      reportIssue: { useMutation: () => ({ mutate: mocks.reportIssue, isPending: false }) },
      setHelpVote: { useMutation: () => ({ mutate: mocks.setHelpVote, isPending: false }) },
      toggleHelpFavorite: { useMutation: () => ({ mutate: mocks.toggleHelpFavorite, isPending: false }) },
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

  it("filtra soluciones de ayuda y muestra un resultado vacío cuando no encuentra coincidencias", async () => {
    const user = userEvent.setup();
    render(<OnboardingCenter role="owner" />);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("tab", { name: "Ayuda y errores" }));
    const search = await screen.findByRole("textbox", { name: "Buscar soluciones de ayuda" });
    await user.type(search, "reporte");
    expect(screen.getByText("No recibo un reporte o notificación")).toBeTruthy();
    await user.clear(search);
    await user.type(search, "palabra inexistente");
    expect(screen.getByText("No encontramos una solución exacta.")).toBeTruthy();
  });

  it("permite minimizar, restaurar, ampliar y cerrar claramente la guía", async () => {
    const user = userEvent.setup();
    render(<OnboardingCenter role="manager" />);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Minimizar guía" }));
    expect(screen.getByText("Guía SongTap minimizada")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /restaurar/i }));
    expect(screen.getByRole("button", { name: "Ampliar guía" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ampliar guía" }));
    expect(screen.getByRole("button", { name: "Reducir guía" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cerrar guía" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("permite votar y guardar una solución de ayuda como favorita", async () => {
    const user = userEvent.setup();
    render(<OnboardingCenter role="owner" />);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("tab", { name: "Ayuda y errores" }));
    const useful = await screen.findByRole("button", { name: "Esta solución fue útil: Veo Acceso denegado" });
    await user.click(useful);
    expect(mocks.setHelpVote).toHaveBeenCalledWith({ articleKey: "access-denied", vote: "up" });
    await user.click(screen.getByRole("button", { name: "Guardar Veo Acceso denegado en favoritos" }));
    expect(mocks.toggleHelpFavorite).toHaveBeenCalledWith({ articleKey: "access-denied" });
  });
});
