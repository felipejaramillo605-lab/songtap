// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Manager temporal", email: "manager@example.com" },
    logout: mocks.logout,
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    notifications: {
      getPendingCount: { useQuery: () => ({ data: 0 }) },
      getSettings: { useQuery: () => ({ data: null }) },
    },
  },
}));

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a>,
  useLocation: () => ["/manager", vi.fn()],
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import SongTapLayout from "./SongTapLayout";

describe("SongTapLayout", () => {
  beforeEach(() => mocks.logout.mockReset());

  it("ejecuta logout al pulsar el botón visible Salir", async () => {
    const user = userEvent.setup();
    render(<SongTapLayout role="manager"><div>Contenido protegido</div></SongTapLayout>);

    await user.click(screen.getAllByRole("button", { name: "Salir" })[0]);

    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });
});
