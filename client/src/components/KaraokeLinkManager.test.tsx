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
});
