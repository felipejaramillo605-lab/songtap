// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import NowPlayingStrip from "./NowPlayingStrip";

describe("NowPlayingStrip", () => {
  it("muestra la canción actual con una región de estado accesible", () => {
    render(<NowPlayingStrip current={{ songName: "La Gozadera", artist: "Gente de Zona" }} />);

    expect(screen.getByRole("status", { name: "Canción en reproducción" })).toBeTruthy();
    expect(screen.getByText("La Gozadera")).toBeTruthy();
    expect(screen.getByText("Gente de Zona")).toBeTruthy();
  });

  it("explica cuando el Staff aún no ha marcado una canción", () => {
    render(<NowPlayingStrip current={null} />);

    expect(screen.getByText("El Staff aún no ha marcado una canción en reproducción.")).toBeTruthy();
  });
});
