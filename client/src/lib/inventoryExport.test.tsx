import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { buildInventoryCostWasteFilename, createInventoryCostWasteWorkbook } from "./inventoryExport";

describe("inventoryExport", () => {
  it("crea un libro con resumen, costos, márgenes y mermas detalladas", () => {
    const workbook = createInventoryCostWasteWorkbook({
      venueName: "Local Centro",
      generatedAt: new Date("2026-08-25T12:00:00.000Z"),
      items: [{ id: 1, name: "Ron", sku: "RON-01", baseUnit: "ml", currentStockBase: "1000", averageUnitCostBase: "12" }],
      margins: [{ name: "Cuba libre", salePrice: 15000, recipeCost: 2400, marginAmount: 12600, marginPercent: 84, isCosted: true }],
      wastes: [{ id: 8, inventoryItemId: 1, quantityBase: "100", unitCostBase: "12", totalCost: "1200", reason: "expired", note: "Envase abierto", createdAt: new Date("2026-08-24T10:00:00.000Z") }],
    });
    expect(workbook.SheetNames).toEqual(["Resumen", "Costos", "Márgenes", "Mermas"]);
    expect(workbook.Sheets.Resumen?.A1?.v).toContain("costos y mermas");
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Costos)).toEqual([expect.objectContaining({ Insumo: "Ron", "Valor estimado de existencias": 12000 })]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Mermas)).toEqual([expect.objectContaining({ Insumo: "Ron", Motivo: "Vencimiento", "Valor de merma": 1200 })]);
  });

  it("genera un nombre estable para el archivo Excel", () => {
    expect(buildInventoryCostWasteFilename(new Date("2026-08-25T12:00:00.000Z"))).toBe("songtap-costos-mermas-2026-08-25.xlsx");
  });
});
