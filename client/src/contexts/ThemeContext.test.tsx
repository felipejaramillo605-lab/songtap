// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeContext";

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return <button type="button" onClick={toggleTheme}>Tema: {theme}</button>;
}

afterEach(() => {
  cleanup();
  document.documentElement.className = "";
  localStorage.clear();
});

describe("ThemeProvider", () => {
  it("alterna el modo, actualiza la clase raíz y conserva la preferencia", () => {
    render(<ThemeProvider defaultTheme="dark" switchable><ThemeProbe /></ThemeProvider>);
    expect(screen.getByRole("button").textContent).toContain("Tema: dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).toContain("Tema: light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("ignora valores de almacenamiento no compatibles y conserva el tema predeterminado", () => {
    localStorage.setItem("theme", "neon");
    render(<ThemeProvider defaultTheme="light" switchable><ThemeProbe /></ThemeProvider>);
    expect(screen.getByRole("button").textContent).toContain("Tema: light");
  });
});
