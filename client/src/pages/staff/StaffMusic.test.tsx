// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ normalize: vi.fn(), saveKaraokeLink: vi.fn(), updateKaraokeLinkStatus: vi.fn(), refetch: vi.fn(), historyRefetch: vi.fn(), toastSuccess: vi.fn(), toastError: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 4, role: "staff", venueId: 7 }, isAuthenticated: true, loading: false }) }));
vi.mock("@/lib/trpc", () => ({ trpc: {
  music: {
    getStaffQueue: { useQuery: () => ({ data: { current: null, queue: [{ id: 14, songName: "Vivir Mi Vida - Marc Anthony", artist: "Artista desconocido", isCurrentlyPlaying: false, addedByTableName: "Mesa 3", createdAt: new Date("2026-08-15T18:00:00Z") }] }, refetch: mocks.refetch }) },
    playSong: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    removeSong: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    normalizeSongMetadata: { useMutation: () => ({ mutate: mocks.normalize, isPending: false }) },
    getKaraokeProviders: { useQuery: () => ({ data: [] }) },
    getPlaybackHistory: { useQuery: () => ({ data: [{ id: 9, songName: "La Gozadera", artist: "Gente de Zona", playedAt: new Date("2026-08-20T18:00:00Z"), playedByUserName: "Laura Staff", karaokeUrl: "https://example.com/karaoke", karaokeLinkStatus: "working" }], refetch: mocks.historyRefetch }) },
    saveKaraokeLink: { useMutation: () => ({ mutate: mocks.saveKaraokeLink, isPending: false }) },
    updateKaraokeLinkStatus: { useMutation: () => ({ mutate: mocks.updateKaraokeLinkStatus, isPending: false }) },
  },
  venues: { getById: { useQuery: () => ({ data: { musicProvider: "manual", musicConnectionStatus: "not_configured" } }) } },
} }));
vi.mock("@/components/SongTapLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({ Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>, CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>, CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3> }));
vi.mock("@/const", () => ({ getLoginUrl: () => "/login" }));
vi.mock("wouter", () => ({ useLocation: () => ["/staff/music", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

import StaffMusic from "./StaffMusic";

describe("StaffMusic normalización local", () => {
  beforeEach(() => { mocks.normalize.mockReset(); mocks.saveKaraokeLink.mockReset(); mocks.updateKaraokeLinkStatus.mockReset(); mocks.refetch.mockReset(); mocks.historyRefetch.mockReset(); });
  afterEach(() => cleanup());

  it("permite normalizar una solicitud sin enviar metadatos a proveedores externos", () => {
    render(<StaffMusic />);
    fireEvent.click(screen.getByRole("button", { name: "Normalizar datos de Vivir Mi Vida - Marc Anthony" }));
    expect(mocks.normalize).toHaveBeenCalledWith({ venueId: 7, songId: 14 });
  });

  it("ofrece una búsqueda externa de karaoke por canción sin llamar a una mutación", () => {
    render(<StaffMusic />);
    const karaokeLink = screen.getByRole("link", { name: "Buscar karaoke de Vivir Mi Vida - Marc Anthony en YouTube" });

    expect(karaokeLink.getAttribute("href")).toBe(
      "https://www.youtube.com/results?search_query=Vivir+Mi+Vida+-+Marc+Anthony+Artista+desconocido+karaoke+con+letra"
    );
    expect(karaokeLink.getAttribute("target")).toBe("_blank");
    expect(mocks.normalize).not.toHaveBeenCalled();
  });

  it("permite iniciar el guardado de un enlace elegido sin mezclarlo con la normalización", () => {
    render(<StaffMusic />);
    expect(screen.getByRole("button", { name: "Guardar enlace de karaoke para Vivir Mi Vida - Marc Anthony" })).toBeTruthy();
    expect(screen.getByText("Historial de reproducción")).toBeTruthy();
    expect(mocks.saveKaraokeLink).not.toHaveBeenCalled();
  });

  it("ofrece rango de fechas y muestra el Staff que reprodujo cada canción del historial", () => {
    render(<StaffMusic />);
    expect(screen.getByLabelText("Desde")).toBeTruthy();
    expect(screen.getByLabelText("Hasta")).toBeTruthy();
    expect(screen.getByText("Reproducida por: Laura Staff")).toBeTruthy();
    expect(screen.getAllByText("Funciona").length).toBeGreaterThan(0);
  });
});
