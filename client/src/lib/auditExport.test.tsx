import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { filterAuditLogs } from "./auditFilters";
import { buildAuditFilename, createAuditCsv, createAuditWorkbook, toAuditExportRows } from "./auditExport";

const log = {
  id: 12,
  venueId: 30001,
  companyName: "Bar La Noche",
  userId: 7,
  executorName: "Laura Gómez",
  executorEmail: "laura@example.com",
  userRole: "manager",
  module: "Pedidos",
  action: "ORDER_DELIVERED",
  entity: "order",
  entityId: 44,
  details: JSON.stringify({ total: "$45.000", notes: "Cliente satisfecho" }),
  createdAt: new Date("2026-08-15T17:30:00.000Z"),
};

describe("auditExport", () => {
  it("convierte eventos autorizados en filas legibles para exportación", () => {
    const [row] = toAuditExportRows([log]);
    expect(row.Compañía).toBe("Bar La Noche");
    expect(row["Usuario ejecutor"]).toBe("Laura Gómez");
    expect(row.Detalle).toBe("$45.000 · Cliente satisfecho");
    expect(row.Acción).toBe("ORDER_DELIVERED");
  });

  it("protege las comillas y comas al construir CSV", () => {
    const csv = createAuditCsv([{ ...toAuditExportRows([log])[0], Detalle: 'Cambio, con "comillas"' }]);
    expect(csv).toContain('"Cambio, con ""comillas"""');
  });

  it("genera un libro Excel con resumen y eventos filtrados", () => {
    const workbook = createAuditWorkbook(toAuditExportRows([log]), { company: "30001", module: "Pedidos", user: "7" });
    expect(workbook.SheetNames).toEqual(["Resumen", "Eventos"]);
    expect(workbook.Sheets.Resumen?.A3?.v).toBe("Eventos exportados");
    expect(workbook.Sheets.Eventos?.A1?.v).toBe("ID evento");
    expect(XLSX.write(workbook, { bookType: "xlsx", type: "array" }).byteLength).toBeGreaterThan(0);
  });

  it("exporta únicamente el subconjunto autorizado por los filtros activos", () => {
    const secondLog = { ...log, id: 13, venueId: 30002, companyName: "Otro local", module: "Mesas", userId: 9 };
    const filtered = filterAuditLogs([log, secondLog], { company: "30001", module: "Pedidos", user: "7" });
    const rows = toAuditExportRows(filtered);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.["ID evento"]).toBe(12);
    expect(createAuditCsv(rows)).not.toContain("Otro local");
  });

  it("crea nombres de archivo deterministas", () => {
    expect(buildAuditFilename("csv", new Date("2026-08-15T17:30:00.000Z"))).toBe("songtap-auditoria-2026-08-15.csv");
  });
});
