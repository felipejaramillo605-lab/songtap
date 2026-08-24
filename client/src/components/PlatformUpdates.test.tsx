// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PlatformUpdates from "./PlatformUpdates";

describe("PlatformUpdates", () => {
  afterEach(() => cleanup());

  it("se abre solo mediante su control explícito y se cierra sin tocar el onboarding", () => {
    render(<PlatformUpdates />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Novedades" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Novedades de SongTap" })).toBeTruthy();
    expect(screen.getByText(/independiente de tu guía de inicio/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
