import * as XLSX from "xlsx";

export type InventoryCostExportItem = {
  id: number;
  name: string;
  sku?: string | null;
  baseUnit: string;
  currentStockBase: string | number;
  averageUnitCostBase: string | number;
};

export type InventoryMarginExport = {
  name: string;
  salePrice: number;
  recipeCost: number;
  marginAmount: number;
  marginPercent: number | null;
  isCosted: boolean;
};

export type InventoryWasteExport = {
  id: number;
  inventoryItemId: number;
  quantityBase: string | number;
  unitCostBase: string | number;
  totalCost: string | number;
  reason: string;
  note?: string | null;
  createdAt: Date | string;
};

const money = (value: number) => `$${Math.round(value).toLocaleString("es-CO")}`;

export function createInventoryCostWasteWorkbook(input: { venueName: string; items: InventoryCostExportItem[]; margins: InventoryMarginExport[]; wastes: InventoryWasteExport[]; generatedAt?: Date }) {
  const generatedAt = input.generatedAt ?? new Date();
  const totalInventoryCost = input.items.reduce((sum, item) => sum + Number(item.currentStockBase) * Number(item.averageUnitCostBase), 0);
  const totalWasteCost = input.wastes.reduce((sum, waste) => sum + Number(waste.totalCost), 0);
  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([
    ["Reporte de costos y mermas · SongTap"],
    ["Local", input.venueName],
    ["Generado", generatedAt.toLocaleString("es-CO")],
    ["Insumos incluidos", input.items.length],
    ["Valor estimado del inventario", money(totalInventoryCost)],
    ["Valor de mermas registradas", money(totalWasteCost)],
    ["Fórmulas con costo", input.margins.filter((margin) => margin.isCosted).length],
    ["Fuente", "Inventario del local; costos promedio ponderados y mermas auditadas."],
  ]);
  summary["!cols"] = [{ wch: 32 }, { wch: 72 }];
  const costs = XLSX.utils.json_to_sheet(input.items.map((item) => ({
    Insumo: item.name,
    SKU: item.sku || "",
    "Unidad base": item.baseUnit,
    "Stock disponible": Number(item.currentStockBase),
    "Costo promedio por unidad base": Number(item.averageUnitCostBase),
    "Valor estimado de existencias": Number(item.currentStockBase) * Number(item.averageUnitCostBase),
  })));
  costs["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 28 }];
  costs["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 5, r: Math.max(input.items.length, 1) } }) };
  const recipeCosts = XLSX.utils.json_to_sheet(input.margins.map((margin) => ({
    Producto: margin.name,
    "Precio de venta": margin.salePrice,
    "Costo de receta": margin.recipeCost,
    "Margen bruto": margin.marginAmount,
    "Margen bruto (%)": margin.marginPercent === null ? "N/A" : `${margin.marginPercent}%`,
    Estado: margin.isCosted ? "Costeado" : "Falta costo de insumo",
  })));
  recipeCosts["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 24 }];
  recipeCosts["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 5, r: Math.max(input.margins.length, 1) } }) };
  const itemById = new Map(input.items.map((item) => [item.id, item]));
  const wastes = XLSX.utils.json_to_sheet(input.wastes.map((waste) => ({
    ID: waste.id,
    Insumo: itemById.get(waste.inventoryItemId)?.name ?? `Insumo #${waste.inventoryItemId}`,
    Motivo: waste.reason === "expired" ? "Vencimiento" : waste.reason,
    "Cantidad en unidad base": Number(waste.quantityBase),
    "Costo por unidad base": Number(waste.unitCostBase),
    "Valor de merma": Number(waste.totalCost),
    Observación: waste.note || "",
    Fecha: new Date(waste.createdAt).toLocaleString("es-CO"),
  })));
  wastes["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 18 }, { wch: 24 }, { wch: 26 }, { wch: 20 }, { wch: 42 }, { wch: 24 }];
  wastes["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 7, r: Math.max(input.wastes.length, 1) } }) };
  XLSX.utils.book_append_sheet(workbook, summary, "Resumen");
  XLSX.utils.book_append_sheet(workbook, costs, "Costos");
  XLSX.utils.book_append_sheet(workbook, recipeCosts, "Márgenes");
  XLSX.utils.book_append_sheet(workbook, wastes, "Mermas");
  return workbook;
}

export function buildInventoryCostWasteFilename(date = new Date()) {
  return `songtap-costos-mermas-${date.toISOString().slice(0, 10)}.xlsx`;
}

export function downloadInventoryCostWasteExcel(input: Parameters<typeof createInventoryCostWasteWorkbook>[0]) {
  XLSX.writeFileXLSX(createInventoryCostWasteWorkbook(input), buildInventoryCostWasteFilename(input.generatedAt ?? new Date()));
}
