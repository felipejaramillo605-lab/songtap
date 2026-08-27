import { describe, expect, it } from "vitest";
import { buildPqrsFilename, createPqrsCsv, createPqrsWorkbook, toPqrsExportRows } from "./pqrsExport";

const venues = [{ venueId: 7, venueName: "Bar, Central", total: 10, open: 2, inReview: 3, resolved: 5, resolutionRate: 50, averageResponseMinutes: 42, slaEvaluated: 8, slaMet: 6, slaBreached: 2, slaComplianceRate: 75, previousSlaComplianceRate: 50, slaComplianceChange: 25 }];

describe("pqrsExport", () => {
  it("convierte el desempeño por local a filas exportables y CSV escapado", () => {
    const rows = toPqrsExportRows(venues, { typeLabel: "Queja", statusLabel: "Resuelta" });
    expect(rows[0]).toMatchObject({ Local: "Bar, Central", "PQRS recibidas": 10, "Tasa de resolución": "50%", "Cumplimiento SLA": "75%", "Cumplimiento SLA anterior": "50%", "Variación SLA (pp)": "+25 pp", "Estado de riesgo SLA": "Sin caída significativa", "Tipo PQRS": "Queja", "Estado PQRS": "Resuelta" });
    const csv = createPqrsCsv(rows, new Date("2026-08-01T00:00:00"), new Date("2026-08-15T23:59:59.999"));
    expect(csv).toContain('"Periodo desde","2026-08-01"');
    expect(csv).toContain('"Periodo hasta","2026-08-15"');
    expect(csv).toContain('"Bar, Central"');
    expect(csv).toContain('"Respuesta media (minutos)"');
  });

  it("crea un libro con resumen, locales y periodo activo", () => {
    const workbook = createPqrsWorkbook(toPqrsExportRows(venues, { typeLabel: "Queja", statusLabel: "Resuelta" }), { total: 10, open: 2, inReview: 3, resolved: 5, resolutionRate: 50, slaEvaluated: 8, slaMet: 6, slaBreached: 2, slaComplianceRate: 75, previousSlaComplianceRate: 50, slaComplianceChange: 25 }, new Date("2026-08-01"), new Date("2026-08-15"), { typeLabel: "Queja", statusLabel: "Resuelta" });
    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual(["Resumen", "Locales"]);
    expect(workbook.sheets[1]?.rows[0]).toContain("Cumplimiento SLA anterior");
    expect(workbook.sheets[1]?.rows[1]).toContain("Bar, Central");
    expect(workbook.sheets[1]?.rows[1]).toContain("Resuelta");
  });

  it("genera un nombre de archivo estable y específico para PQRS", () => {
    expect(buildPqrsFilename("xlsx", new Date("2026-08-15T12:00:00Z"))).toBe("songtap-desempeno-pqrs-2026-08-15.xlsx");
  });
});
