import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ downloadXlsxWorkbook: vi.fn(), save: vi.fn() }));

vi.mock("./xlsxExport", async () => ({ ...(await vi.importActual<typeof import("./xlsxExport")>("./xlsxExport")), downloadXlsxWorkbook: mocks.downloadXlsxWorkbook }));
vi.mock("jspdf", () => ({ jsPDF: class { setFontSize() {} text() {} addPage() {} save = mocks.save; } }));

import { buildOwnerReportFilename, createOwnerReportWorkbook, downloadOwnerReportExcel, downloadOwnerReportPdf, parseOwnerReportSummary } from "./ownerReportExport";

const summary = {
  periodStart: "2026-08-17T05:00:00.000Z",
  periodEnd: "2026-08-24T05:00:00.000Z",
  venueCount: 2,
  activeVenueCount: 2,
  deliveredOrderCount: 24,
  totalRevenue: 480000,
  averageTicket: 20000,
  pqrsReceived: 3,
  venues: [{ venueId: 1, venueName: "Bar Central", revenue: 480000, orderCount: 24, averageTicket: 20000 }],
  comparison: {
    periodStart: "2026-08-10T05:00:00.000Z",
    periodEnd: "2026-08-17T05:00:00.000Z",
    totalRevenue: { previousValue: 400000, change: 80000, percentChange: 20 },
    deliveredOrderCount: { previousValue: 20, change: 4, percentChange: 20 },
    averageTicket: { previousValue: 20000, change: 0, percentChange: 0 },
    pqrsReceived: { previousValue: 5, change: -2, percentChange: -40 },
  },
};

describe("owner report exports", () => {
  it("interpreta el resumen solo si contiene el comparativo requerido", () => {
    expect(parseOwnerReportSummary(JSON.stringify(summary))).toMatchObject({ totalRevenue: 480000, comparison: { totalRevenue: { percentChange: 20 } } });
    expect(parseOwnerReportSummary(JSON.stringify({ totalRevenue: 1 }))).toBeNull();
  });

  it("crea un Excel con resumen, comparación y desglose por local", () => {
    const workbook = createOwnerReportWorkbook(summary, new Date("2026-08-24T14:00:00.000Z"));
    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual(["Resumen", "Locales"]);
    downloadOwnerReportExcel(14, summary, new Date("2026-08-24T14:00:00.000Z"));
    expect(mocks.downloadXlsxWorkbook).toHaveBeenCalledWith(workbook, "songtap-reporte-owner-14.xlsx");
    downloadOwnerReportPdf(14, summary, new Date("2026-08-24T14:00:00.000Z"));
    expect(mocks.save).toHaveBeenCalledWith("songtap-reporte-owner-14.pdf");
    expect(buildOwnerReportFilename(14, "pdf")).toBe("songtap-reporte-owner-14.pdf");
  });
});
