import { describe, expect, it } from "vitest";
import { filterAuditLogs } from "../client/src/lib/auditFilters";

const logs = [
  { venueId: 10, module: "Pedidos", userId: 1, action: "ORDER_DELIVERED" },
  { venueId: 20, module: "Menú", userId: 2, action: "UPDATE_MENU" },
  { venueId: null, module: "Sistema", userId: 1, action: "UPDATE_USER_PROFILE" },
];

describe("filterAuditLogs", () => {
  it("filtra de manera combinada por compañía, módulo y usuario", () => {
    expect(filterAuditLogs(logs, { company: "10", module: "Pedidos", user: "1" })).toEqual([logs[0]]);
    expect(filterAuditLogs(logs, { company: "all", module: "all", user: "1" })).toEqual([logs[0], logs[2]]);
  });

  it("incluye acciones globales y permite restablecer todos los filtros", () => {
    expect(filterAuditLogs(logs, { company: "global", module: "Sistema", user: "all" })).toEqual([logs[2]]);
    expect(filterAuditLogs(logs, { company: "all", module: "all", user: "all" })).toEqual(logs);
  });
});
