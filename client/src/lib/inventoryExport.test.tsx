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
    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual(["Resumen", "Costos", "Márgenes", "Mermas"]);
    expect(workbook.sheets[0]?.rows[0]?.[0]).toContain("costos y mermas");
    expect(workbook.sheets[1]?.rows).toContainEqual(["Ron", "RON-01", "ml", 1000, 12, 12000]);
    expect(workbook.sheets[3]?.rows).toContainEqual([8, "Ron", "Vencimiento", 100, 12, 1200, "Envase abierto", expect.any(String)]);
  });

  it("genera un nombre estable para el archivo Excel", () => {
    expect(buildInventoryCostWasteFilename(new Date("2026-08-25T12:00:00.000Z"))).toBe("songtap-costos-mermas-2026-08-25.xlsx");
  });
});
