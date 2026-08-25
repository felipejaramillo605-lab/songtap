// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import KaraokeLinkManager from "./KaraokeLinkManager";

describe("KaraokeLinkManager", () => {
  it("guarda el enlace elegido con su proveedor para la canción indicada", () => {
    const onSave = vi.fn();
    render(
      <KaraokeLinkManager
        song={{ id: 14, songName: "Vivir Mi Vida", artist: "Marc Anthony" }}
        providers={[]}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar enlace de karaoke para Vivir Mi Vida" }));
    fireEvent.change(screen.getByLabelText("Enlace elegido *"), { target: { value: "https://www.youtube.com/watch?v=karaoke" } });
    fireEvent.change(screen.getByLabelText("Proveedor (opcional)"), { target: { value: "YouTube" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar enlace" }));

    expect(onSave).toHaveBeenCalledWith({
      songId: 14,
      karaokeUrl: "https://www.youtube.com/watch?v=karaoke",
      karaokeProviderName: "YouTube",
    });
  });

  it("muestra una etiqueta clara cuando el enlace requiere revisión", () => {
    render(
      <KaraokeLinkManager
        song={{ id: 15, songName: "La Gozadera", artist: "Gente de Zona", karaokeUrl: "https://example.com/karaoke", karaokeLinkStatus: "needs_review" }}
        providers={[]}
        onSave={vi.fn()}
        onUpdateStatus={vi.fn()}
      />
    );

    expect(screen.getByText("Revisar")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Cambiar estado del enlace de La Gozadera" })).toBeTruthy();
  });

  it("solicita una nota antes de enviar un enlace a revisión", () => {
    const onUpdateStatus = vi.fn();
    render(
      <KaraokeLinkManager
        song={{ id: 16, songName: "Color Esperanza", artist: "Diego Torres", karaokeUrl: "https://example.com/karaoke", karaokeLinkStatus: "working" }}
        providers={[]}
        onSave={vi.fn()}
        onUpdateStatus={onUpdateStatus}
      />
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Cambiar estado del enlace de Color Esperanza" }));
    fireEvent.click(screen.getByRole("option", { name: "Requiere revisión" }));
    expect(screen.getByText("Explicar revisión del enlace")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nota de revisión *"), { target: { value: "El video ya no está disponible" } });
    fireEvent.change(screen.getByLabelText("Fecha límite *"), { target: { value: "2030-08-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar como Requiere revisión" }));

    expect(onUpdateStatus).toHaveBeenCalledWith({ songId: 16, status: "needs_review", reviewNote: "El video ya no está disponible", reviewDueAt: expect.any(Date) });
  });
});
