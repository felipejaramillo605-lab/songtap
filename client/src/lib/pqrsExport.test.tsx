import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildPqrsFilename, createPqrsCsv, createPqrsWorkbook, toPqrsExportRows } from "./pqrsExport";

const venues = [{ venueId: 7, venueName: "Bar, Central", total: 10, open: 2, inReview: 3, resolved: 5, resolutionRate: 50, averageResponseMinutes: 42 }];

describe("pqrsExport", () => {
  it("convierte el desempeño por local a filas exportables y CSV escapado", () => {
    const rows = toPqrsExportRows(venues, { typeLabel: "Queja", statusLabel: "Resuelta" });
    expect(rows[0]).toMatchObject({ Local: "Bar, Central", "PQRS recibidas": 10, "Tasa de resolución": "50%", "Tipo PQRS": "Queja", "Estado PQRS": "Resuelta" });
    const csv = createPqrsCsv(rows, new Date("2026-08-01T00:00:00"), new Date("2026-08-15T23:59:59.999"));
    expect(csv).toContain('"Periodo desde","2026-08-01"');
    expect(csv).toContain('"Periodo hasta","2026-08-15"');
    expect(csv).toContain('"Bar, Central"');
    expect(csv).toContain('"Respuesta media (minutos)"');
  });

  it("crea un libro con resumen, locales y periodo activo", () => {
    const workbook = createPqrsWorkbook(toPqrsExportRows(venues, { typeLabel: "Queja", statusLabel: "Resuelta" }), { total: 10, open: 2, inReview: 3, resolved: 5, resolutionRate: 50 }, new Date("2026-08-01"), new Date("2026-08-15"), { typeLabel: "Queja", statusLabel: "Resuelta" });
    expect(workbook.SheetNames).toEqual(["Resumen", "Locales"]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Locales)).toEqual([expect.objectContaining({ Local: "Bar, Central", Resueltas: 5, "Tipo PQRS": "Queja", "Estado PQRS": "Resuelta" })]);
  });

  it("genera un nombre de archivo estable y específico para PQRS", () => {
    expect(buildPqrsFilename("xlsx", new Date("2026-08-15T12:00:00Z"))).toBe("songtap-desempeno-pqrs-2026-08-15.xlsx");
  });
});
