// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  createTicket: vi.fn(),
  updateTicket: vi.fn(),
  refetchClient: vi.fn(),
  refetchVenue: vi.fn(),
  clientTickets: [] as any[],
  venueTickets: [] as any[],
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 91, name: "Manager de prueba", role: "manager", venueId: 7 }, isAuthenticated: true, loading: false }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    pqrs: {
      getMyTickets: { useQuery: () => ({ data: mocks.clientTickets, refetch: mocks.refetchClient }) },
      create: { useMutation: () => ({ mutate: mocks.createTicket, isPending: false }) },
      listByVenue: { useQuery: () => ({ data: mocks.venueTickets, isLoading: false, refetch: mocks.refetchVenue }) },
      update: { useMutation: () => ({ mutate: mocks.updateTicket, isPending: false }) },
    },
  },
}));
vi.mock("@/components/SongTapLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label> }));
vi.mock("@/const", () => ({ getLoginUrl: () => "/login" }));
vi.mock("wouter", () => ({ useLocation: () => ["/manager/pqrs", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

import ClientPqrs from "../components/ClientPqrs";
import ManagerPqrs from "./manager/ManagerPqrs";

const clientSession = { sessionToken: "valid-pqrs-session-token", sessionId: 70, venueId: 7, tableId: 3 };
const ticket = {
  id: 120,
  venueId: 7,
  tableId: 3,
  sessionId: 70,
  clientName: "Camila",
  type: "suggestion",
  subject: "Mejorar el sonido",
  message: "Sería ideal reducir el volumen de los parlantes cercanos.",
  status: "open",
  response: "Gracias, ya ajustamos el volumen.",
  createdAt: new Date("2026-08-15T18:00:00.000Z"),
};

describe("interfaces PQRS", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    mocks.createTicket.mockReset();
    mocks.updateTicket.mockReset();
    mocks.refetchClient.mockReset();
    mocks.refetchVenue.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.clientTickets = [];
    mocks.venueTickets = [];
  });

  it("permite al cliente QR enviar una PQRS y ver la respuesta del local", () => {
    mocks.clientTickets = [ticket];
    render(<ClientPqrs session={clientSession} />);

    fireEvent.change(screen.getByLabelText("Asunto"), { target: { value: "Iluminación de la mesa" } });
    fireEvent.change(screen.getByLabelText("Mensaje"), { target: { value: "La luz de nuestra mesa es demasiado tenue durante la cena." } });
    fireEvent.click(screen.getByRole("button", { name: /enviar pqrs/i }));

    expect(mocks.createTicket).toHaveBeenCalledWith(expect.objectContaining({
      venueId: 7,
      sessionId: 70,
      tableId: 3,
      subject: "Iluminación de la mesa",
    }));
    expect(screen.getByText("Gracias, ya ajustamos el volumen.")).toBeTruthy();
  });

  it("permite al Manager seleccionar una PQRS, responderla y cambiar su estado", async () => {
    mocks.venueTickets = [ticket];
    render(<ManagerPqrs />);

    fireEvent.click(screen.getByRole("button", { name: /mejorar el sonido/i }));
    await waitFor(() => expect(screen.getByLabelText("Respuesta para el cliente")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Estado de atención"), { target: { value: "resolved" } });
    fireEvent.change(screen.getByLabelText("Respuesta para el cliente"), { target: { value: "Ajustamos el volumen y verificamos la zona." } });
    fireEvent.click(screen.getByRole("button", { name: /guardar seguimiento/i }));

    expect(mocks.updateTicket).toHaveBeenCalledWith({
      venueId: 7,
      ticketId: 120,
      status: "resolved",
      response: "Ajustamos el volumen y verificamos la zona.",
    });
  });
});
