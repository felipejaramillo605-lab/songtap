// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  writeFileXLSX: vi.fn(),
  createAuditCsv: vi.fn(() => "csv-content"),
  createAuditWorkbook: vi.fn(() => "workbook"),
  buildAuditFilename: vi.fn((extension: string) => `songtap-auditoria.${extension}`),
}));

const logs = [
  {
    id: 1,
    venueId: 30001,
    companyName: "Bar La Noche",
    userId: 7,
    executorName: "Laura Gómez",
    executorEmail: "laura@example.com",
    userRole: "manager",
    module: "Pedidos",
    action: "ORDER_DELIVERED",
    entity: "order",
    entityId: 33,
    details: "Pedido entregado",
    createdAt: new Date("2026-08-15T17:30:00.000Z"),
  },
];

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "owner" }, isAuthenticated: true, loading: false }),
}));
vi.mock("@/lib/trpc", () => ({ trpc: { finance: { auditLogs: { useQuery: () => ({ data: logs, isLoading: false }) } } } }));
vi.mock("@/components/SongTapLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));
vi.mock("@/const", () => ({ getLoginUrl: () => "/login" }));
vi.mock("wouter", () => ({ useLocation: () => ["/owner/audit", vi.fn()] }));
vi.mock("xlsx", () => ({ writeFileXLSX: mocks.writeFileXLSX }));
vi.mock("@/lib/auditExport", () => ({
  toAuditExportRows: (items: typeof logs) => items.map((item) => ({ "ID evento": item.id, Compañía: item.companyName })),
  createAuditCsv: mocks.createAuditCsv,
  createAuditWorkbook: mocks.createAuditWorkbook,
  buildAuditFilename: mocks.buildAuditFilename,
}));

import OwnerAudit from "./OwnerAudit";

describe("OwnerAudit exports", () => {
  beforeEach(() => {
    mocks.writeFileXLSX.mockReset();
    mocks.createAuditCsv.mockClear();
    mocks.createAuditWorkbook.mockClear();
    mocks.buildAuditFilename.mockClear();
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:auditoria"), revokeObjectURL: vi.fn() });
  });

  it("descarga CSV y Excel desde los botones visibles del Owner", async () => {
    const user = userEvent.setup();
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<OwnerAudit />);

    await user.click(screen.getByRole("button", { name: /csv/i }));
    expect(mocks.createAuditCsv).toHaveBeenCalledTimes(1);
    expect(anchorClick).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /excel/i }));
    expect(mocks.createAuditWorkbook).toHaveBeenCalledTimes(1);
    expect(mocks.writeFileXLSX).toHaveBeenCalledWith("workbook", "songtap-auditoria.xlsx");
    anchorClick.mockRestore();
  });
});
