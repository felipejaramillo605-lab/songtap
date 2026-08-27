import { downloadXlsxWorkbook, rowsFromRecords, type XlsxWorkbookDefinition } from "./xlsxExport";

export type InventoryCostExportItem = { id: number; name: string; sku?: string | null; baseUnit: string; currentStockBase: string | number; averageUnitCostBase: string | number };
export type InventoryMarginExport = { name: string; salePrice: number; recipeCost: number; marginAmount: number; marginPercent: number | null; isCosted: boolean };
export type InventoryWasteExport = { id: number; inventoryItemId: number; quantityBase: string | number; unitCostBase: string | number; totalCost: string | number; reason: string; note?: string | null; createdAt: Date | string };

const money = (value: number) => `$${Math.round(value).toLocaleString("es-CO")}`;

export function createInventoryCostWasteWorkbook(input: { venueName: string; items: InventoryCostExportItem[]; margins: InventoryMarginExport[]; wastes: InventoryWasteExport[]; generatedAt?: Date }): XlsxWorkbookDefinition {
  const generatedAt = input.generatedAt ?? new Date();
  const totalInventoryCost = input.items.reduce((sum, item) => sum + Number(item.currentStockBase) * Number(item.averageUnitCostBase), 0);
  const totalWasteCost = input.wastes.reduce((sum, waste) => sum + Number(waste.totalCost), 0);
  const costs = input.items.map((item) => ({ Insumo: item.name, SKU: item.sku || "", "Unidad base": item.baseUnit, "Stock disponible": Number(item.currentStockBase), "Costo promedio por unidad base": Number(item.averageUnitCostBase), "Valor estimado de existencias": Number(item.currentStockBase) * Number(item.averageUnitCostBase) }));
  const recipeCosts = input.margins.map((margin) => ({ Producto: margin.name, "Precio de venta": margin.salePrice, "Costo de receta": margin.recipeCost, "Margen bruto": margin.marginAmount, "Margen bruto (%)": margin.marginPercent === null ? "N/A" : `${margin.marginPercent}%`, Estado: margin.isCosted ? "Costeado" : "Falta costo de insumo" }));
  const itemById = new Map(input.items.map((item) => [item.id, item]));
  const wastes = input.wastes.map((waste) => ({ ID: waste.id, Insumo: itemById.get(waste.inventoryItemId)?.name ?? `Insumo #${waste.inventoryItemId}`, Motivo: waste.reason === "expired" ? "Vencimiento" : waste.reason, "Cantidad en unidad base": Number(waste.quantityBase), "Costo por unidad base": Number(waste.unitCostBase), "Valor de merma": Number(waste.totalCost), Observación: waste.note || "", Fecha: new Date(waste.createdAt).toLocaleString("es-CO") }));
  return { sheets: [
    { name: "Resumen", rows: [["Reporte de costos y mermas · SongTap"], ["Local", input.venueName], ["Generado", generatedAt.toLocaleString("es-CO")], ["Insumos incluidos", input.items.length], ["Valor estimado del inventario", money(totalInventoryCost)], ["Valor de mermas registradas", money(totalWasteCost)], ["Fórmulas con costo", input.margins.filter((margin) => margin.isCosted).length], ["Fuente", "Inventario del local; costos promedio ponderados y mermas auditadas."]], columnWidths: [32, 72] },
    { name: "Costos", rows: rowsFromRecords(costs), columnWidths: [30, 18, 14, 18, 28, 28], autoFilter: true },
    { name: "Márgenes", rows: rowsFromRecords(recipeCosts), columnWidths: [30, 18, 18, 18, 18, 24], autoFilter: true },
    { name: "Mermas", rows: rowsFromRecords(wastes), columnWidths: [10, 30, 18, 24, 26, 20, 42, 24], autoFilter: true },
  ] };
}

export function buildInventoryCostWasteFilename(date = new Date()) { return `songtap-costos-mermas-${date.toISOString().slice(0, 10)}.xlsx`; }
export function downloadInventoryCostWasteExcel(input: Parameters<typeof createInventoryCostWasteWorkbook>[0]) { return downloadXlsxWorkbook(createInventoryCostWasteWorkbook(input), buildInventoryCostWasteFilename(input.generatedAt ?? new Date())); }
