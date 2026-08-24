import { jsPDF } from "jspdf";
import { utils, writeFileXLSX } from "xlsx";

export type OwnerReportMetricComparison = {
  previousValue: number;
  change: number;
  percentChange: number | null;
};

export type OwnerReportSummary = {
  periodStart: string;
  periodEnd: string;
  venueCount: number;
  activeVenueCount: number;
  deliveredOrderCount: number;
  totalRevenue: number;
  averageTicket: number;
  pqrsReceived: number;
  venues: Array<{ venueId: number; venueName: string; revenue: number; orderCount: number; averageTicket: number }>;
  comparison: {
    periodStart: string;
    periodEnd: string;
    totalRevenue: OwnerReportMetricComparison;
    deliveredOrderCount: OwnerReportMetricComparison;
    averageTicket: OwnerReportMetricComparison;
    pqrsReceived: OwnerReportMetricComparison;
  };
};

export function parseOwnerReportSummary(summaryJson: string): OwnerReportSummary | null {
  try {
    const value = JSON.parse(summaryJson) as Partial<OwnerReportSummary>;
    if (!value.comparison || !Array.isArray(value.venues)) return null;
    return value as OwnerReportSummary;
  } catch {
    return null;
  }
}

export function buildOwnerReportFilename(reportId: number, extension: "pdf" | "xlsx") {
  return `songtap-reporte-owner-${reportId}.${extension}`;
}

function comparisonRows(summary: OwnerReportSummary) {
  const formatPercent = (value: number | null) => value === null ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  return [
    { Métrica: "Ingresos", Actual: summary.totalRevenue, "Semana anterior": summary.comparison.totalRevenue.previousValue, Variación: summary.comparison.totalRevenue.change, "% variación": formatPercent(summary.comparison.totalRevenue.percentChange) },
    { Métrica: "Pedidos entregados", Actual: summary.deliveredOrderCount, "Semana anterior": summary.comparison.deliveredOrderCount.previousValue, Variación: summary.comparison.deliveredOrderCount.change, "% variación": formatPercent(summary.comparison.deliveredOrderCount.percentChange) },
    { Métrica: "Ticket promedio", Actual: summary.averageTicket, "Semana anterior": summary.comparison.averageTicket.previousValue, Variación: summary.comparison.averageTicket.change, "% variación": formatPercent(summary.comparison.averageTicket.percentChange) },
    { Métrica: "PQRS recibidas", Actual: summary.pqrsReceived, "Semana anterior": summary.comparison.pqrsReceived.previousValue, Variación: summary.comparison.pqrsReceived.change, "% variación": formatPercent(summary.comparison.pqrsReceived.percentChange) },
  ];
}

export function createOwnerReportWorkbook(summary: OwnerReportSummary, generatedAt: Date) {
  const workbook = utils.book_new();
  const summaryRows = [
    { Campo: "Periodo del reporte", Valor: `${new Date(summary.periodStart).toLocaleDateString("es-CO")} — ${new Date(summary.periodEnd).toLocaleDateString("es-CO")}` },
    { Campo: "Periodo comparado", Valor: `${new Date(summary.comparison.periodStart).toLocaleDateString("es-CO")} — ${new Date(summary.comparison.periodEnd).toLocaleDateString("es-CO")}` },
    { Campo: "Generado", Valor: generatedAt.toLocaleString("es-CO") },
    { Campo: "Locales incluidos", Valor: summary.venueCount },
    { Campo: "Locales activos", Valor: summary.activeVenueCount },
    ...comparisonRows(summary),
  ];
  const summarySheet = utils.json_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 26 }, { wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 16 }];
  utils.book_append_sheet(workbook, summarySheet, "Resumen");

  const venueSheet = utils.json_to_sheet(summary.venues.map((venue, index) => ({
    Posición: index + 1,
    Local: venue.venueName,
    Ingresos: venue.revenue,
    "Pedidos entregados": venue.orderCount,
    "Ticket promedio": venue.averageTicket,
  })));
  venueSheet["!cols"] = [{ wch: 12 }, { wch: 28 }, { wch: 18 }, { wch: 20 }, { wch: 18 }];
  utils.book_append_sheet(workbook, venueSheet, "Locales");
  return workbook;
}

export function downloadOwnerReportExcel(reportId: number, summary: OwnerReportSummary, generatedAt: Date) {
  writeFileXLSX(createOwnerReportWorkbook(summary, generatedAt), buildOwnerReportFilename(reportId, "xlsx"));
}

export function downloadOwnerReportPdf(reportId: number, summary: OwnerReportSummary, generatedAt: Date) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const currency = (value: number) => `$${Math.round(value).toLocaleString("es-CO")}`;
  const signed = (value: number) => `${value >= 0 ? "+" : ""}${value.toLocaleString("es-CO", { maximumFractionDigits: 1 })}`;
  pdf.setFontSize(18);
  pdf.text("SongTap · Reporte consolidado Owner", 40, 48);
  pdf.setFontSize(10);
  pdf.text(`Periodo: ${new Date(summary.periodStart).toLocaleDateString("es-CO")} al ${new Date(summary.periodEnd).toLocaleDateString("es-CO")}`, 40, 68);
  pdf.text(`Generado: ${generatedAt.toLocaleString("es-CO")}`, 40, 83);
  pdf.setFontSize(13);
  pdf.text("Resumen y comparación con la semana anterior", 40, 114);
  pdf.setFontSize(10);
  const rows = [
    ["Ingresos", currency(summary.totalRevenue), currency(summary.comparison.totalRevenue.previousValue), signed(summary.comparison.totalRevenue.change)],
    ["Pedidos entregados", String(summary.deliveredOrderCount), String(summary.comparison.deliveredOrderCount.previousValue), signed(summary.comparison.deliveredOrderCount.change)],
    ["Ticket promedio", currency(summary.averageTicket), currency(summary.comparison.averageTicket.previousValue), signed(summary.comparison.averageTicket.change)],
    ["PQRS recibidas", String(summary.pqrsReceived), String(summary.comparison.pqrsReceived.previousValue), signed(summary.comparison.pqrsReceived.change)],
  ];
  pdf.text("Métrica", 40, 136); pdf.text("Actual", 190, 136); pdf.text("Semana anterior", 290, 136); pdf.text("Variación", 440, 136);
  rows.forEach((row, index) => {
    const y = 156 + index * 22;
    row.forEach((cell, cellIndex) => pdf.text(cell, [40, 190, 290, 440][cellIndex], y));
  });
  pdf.setFontSize(13);
  pdf.text("Desempeño por local", 40, 270);
  pdf.setFontSize(9);
  summary.venues.slice(0, 16).forEach((venue, index) => {
    const y = 290 + index * 17;
    pdf.text(`${index + 1}. ${venue.venueName}`.slice(0, 44), 40, y);
    pdf.text(currency(venue.revenue), 250, y);
    pdf.text(`${venue.orderCount} pedidos`, 370, y);
    if (y > 520 && index < summary.venues.length - 1) { pdf.addPage(); }
  });
  pdf.save(buildOwnerReportFilename(reportId, "pdf"));
}
