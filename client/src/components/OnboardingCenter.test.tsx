// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ markOpened: vi.fn(), markAutoShown: vi.fn(), setAutoSuppressed: vi.fn(), reportIssue: vi.fn(), complete: vi.fn(), reset: vi.fn(), setHelpVote: vi.fn(), toggleHelpFavorite: vi.fn(), navigate: vi.fn(), progress: null as any, progressResolved: true, isPreviewMode: false, managedContents: [] as any[], suggestions: [] as any[] }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ onboarding: { getProgress: { invalidate: vi.fn() }, listSupportTickets: { invalidate: vi.fn() }, getHelpInteractions: { invalidate: vi.fn() } }, notifications: { getPendingCount: { invalidate: vi.fn() } } }),
    onboarding: {
      getProgress: { useQuery: () => ({ data: mocks.progress, isSuccess: mocks.progressResolved }) },
      listSupportTickets: { useQuery: () => ({ data: [] }) },
      getHelpInteractions: { useQuery: () => ({ data: { votes: {}, favorites: [] } }) },
      markOpened: { useMutation: () => ({ mutate: mocks.markOpened }) },
      markAutoShown: { useMutation: () => ({ mutate: mocks.markAutoShown }) },
      setAutoSuppressed: { useMutation: () => ({ mutate: mocks.setAutoSuppressed, isPending: false }) },
      complete: { useMutation: (options?: { onSuccess?: () => void }) => ({ mutate: () => { mocks.complete(); options?.onSuccess?.(); }, isPending: false }) },
      reset: { useMutation: () => ({ mutate: mocks.reset, isPending: false }) },
      reportIssue: { useMutation: () => ({ mutate: mocks.reportIssue, isPending: false }) },
      setHelpVote: { useMutation: () => ({ mutate: mocks.setHelpVote, isPending: false }) },
      toggleHelpFavorite: { useMutation: () => ({ mutate: mocks.toggleHelpFavorite, isPending: false }) },
    },
    learning: {
      available: { useQuery: () => ({ data: mocks.managedContents }) },
      suggestions: { useQuery: () => ({ data: mocks.suggestions }) },
    },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isPreviewMode: mocks.isPreviewMode }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/owner", mocks.navigate] }));

import OnboardingCenter from "./OnboardingCenter";

describe("OnboardingCenter", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.progress = null; mocks.progressResolved = true; mocks.isPreviewMode = false; mocks.managedContents = []; mocks.suggestions = []; });

  it("abre el recorrido Owner pendiente y muestra una captura del botón principal", async () => {
    render(<OnboardingCenter role="owner" />);
    await screen.findByRole("dialog");
    expect(screen.getByRole("heading", { name: "Tu guía SongTap" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /captura del dashboard owner/i })).toBeTruthy();
    expect(screen.getAllByText("Generar reporte ahora", { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getByText("Progreso: 1 de 10")).toBeTruthy();
  });

  it("no abre la guía cuando la consulta aún no ha resuelto el progreso", () => {
    mocks.progressResolved = false;
    render(<OnboardingCenter role="owner" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.markAutoShown).not.toHaveBeenCalled();
  });

  it("no reabre la guía después de que el progreso ya fue creado o completado", () => {
    mocks.progress = { id: 1, userId: 25, role: "manager", autoShownAt: new Date(), completedAt: new Date(), suppressAutoOnboarding: true };
    render(<OnboardingCenter role="manager" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.markAutoShown).not.toHaveBeenCalled();
  });

  it("permite alternar entre guía breve y completa con progreso y pasos restantes", async () => {
    const user = userEvent.setup();
    render(<OnboardingCenter role="manager" />);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Guía breve" }));
    expect(screen.getByText("Progreso: 1 de 2")).toBeTruthy();
    expect(screen.getByText("Te falta 1 paso.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Progreso: 2 de 2")).toBeTruthy();
    expect(screen.getByText("Este es el último paso.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Guía completa" }));
    expect(screen.getByText("Progreso: 1 de 11")).toBeTruthy();
  });

  it("permite impedir nuevas aperturas automáticas desde el checkbox", async () => {
    const user = userEvent.setup();
    render(<OnboardingCenter role="owner" />);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("checkbox", { name: /no volver a mostrar automáticamente/i }));
    expect(mocks.setAutoSuppressed).toHaveBeenCalledWith({ suppressAutoOnboarding: true });
  });

  it("cierra y persiste la finalización al completar el último paso", async () => {
    const user = userEvent.setup();
    render(<OnboardingCenter role="staff" />);
    await screen.findByRole("dialog");
    const libraryCard = screen.getAllByText("PQRS y perfil seguro")[0]?.closest("article");
    if (!libraryCard) throw new Error("No se encontró el tutorial final de Staff");
    await user.click(within(libraryCard).getByRole("button", { name: "Añadir a ruta" }));
    await user.click(screen.getByRole("button", { name: "Completar guía" }));
    expect(mocks.complete).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("no intenta completar en modo de pruebas y cierra únicamente la vista de guía", async () => {
    const user = userEvent.setup();
    mocks.isPreviewMode = true;
    render(<OnboardingCenter role="staff" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Abrir guía" }));
    const libraryCard = screen.getAllByText("PQRS y perfil seguro")[0]?.closest("article");
    if (!libraryCard) throw new Error("No se encontró el tutorial final de Staff");
    await user.click(within(libraryCard).getByRole("button", { name: "Añadir a ruta" }));
    await user.click(screen.getByRole("button", { name: "Cerrar guía de prueba" }));
    expect(mocks.complete).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
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

  it("permite buscar un tutorial de inventario y añadirlo a la ruta completa", async () => {
    const user = userEvent.setup();
    render(<OnboardingCenter role="manager" />);
    await screen.findByRole("dialog");
    await user.type(screen.getByRole("textbox", { name: "Buscar tutoriales por módulo" }), "doble aprobación");
    const libraryCard = screen.getAllByText("Conteos, diferencias y doble aprobación").map((node) => node.closest("article")).find((card): card is HTMLElement => Boolean(card && within(card).queryByRole("button", { name: "Añadir a ruta" })));
    if (!libraryCard) throw new Error("No se encontró el tutorial de conteo");
    await user.click(within(libraryCard).getByRole("button", { name: "Añadir a ruta" }));
    expect(screen.getByText("Progreso: 10 de 11")).toBeTruthy();
  });

  it("muestra sugerencias administradas mientras se escribe una búsqueda de guía", async () => {
    const user = userEvent.setup();
    mocks.suggestions = [{ id: 91, title: "Aprobación de compras", category: "Inventario", contentType: "tutorial" }];
    render(<OnboardingCenter role="manager" />);
    await screen.findByRole("dialog");
    await user.type(screen.getByRole("textbox", { name: "Buscar tutoriales por módulo" }), "aprobación");
    expect(screen.getByRole("listbox", { name: "Sugerencias de búsqueda" })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Aprobación de compras/i })).toBeTruthy();
  });

  it("muestra artículos de ayuda publicados por Owner para el rol autorizado", async () => {
    const user = userEvent.setup();
    mocks.managedContents = [{ id: 92, contentType: "help", title: "Recepción guiada", summary: "Pasos propios para validar una compra.", body: "Confirma proveedor\nRevisa lotes", category: "Inventario", modulePath: "/manager/inventory", durationMinutes: 5 }];
    render(<OnboardingCenter role="manager" />);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("tab", { name: "Ayuda y errores" }));
    expect(screen.getByText("Ayuda administrada")).toBeTruthy();
    expect(screen.getByText("Recepción guiada")).toBeTruthy();
  });

  it("ofrece reiniciar el onboarding desde Ayuda", async () => {
    const user = userEvent.setup();
    render(<OnboardingCenter role="staff" />);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("tab", { name: "Ayuda y errores" }));
    await user.click(screen.getByRole("button", { name: "Reiniciar onboarding" }));
    expect(mocks.reset).toHaveBeenCalledTimes(1);
  });
});
