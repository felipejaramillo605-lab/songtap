import { getSlaRiskLabel } from "./pqrsSlaRisk";
import { downloadXlsxWorkbook, escapeCsvCell, rowsFromRecords, type XlsxWorkbookDefinition } from "./xlsxExport";

export type PqrsAnalyticsVenue = { venueId: number; venueName: string; total: number; open: number; inReview: number; resolved: number; resolutionRate: number; averageResponseMinutes: number; slaEvaluated: number; slaMet: number; slaBreached: number; slaComplianceRate: number; previousSlaComplianceRate: number; slaComplianceChange: number };
export type PqrsAnalyticsTotals = Pick<PqrsAnalyticsVenue, "total" | "open" | "inReview" | "resolved" | "resolutionRate" | "slaEvaluated" | "slaMet" | "slaBreached" | "slaComplianceRate" | "previousSlaComplianceRate" | "slaComplianceChange">;
export type PqrsExportRow = { Local: string; "ID local": number; "PQRS recibidas": number; Abiertas: number; "En revisión": number; Resueltas: number; "Tasa de resolución": string; "Respuesta media (minutos)": number; "SLA evaluadas": number; "Cumplen SLA": number; "SLA vencidas": number; "Cumplimiento SLA": string; "Cumplimiento SLA anterior": string; "Variación SLA (pp)": string; "Estado de riesgo SLA": string; "Tipo PQRS": string; "Estado PQRS": string };
export type PqrsExportFilters = { typeLabel: string; statusLabel: string };

export function toPqrsExportRows(venues: PqrsAnalyticsVenue[], filters: PqrsExportFilters = { typeLabel: "Todos los tipos", statusLabel: "Todos los estados" }): PqrsExportRow[] { return venues.map((venue) => ({ Local: venue.venueName, "ID local": venue.venueId, "PQRS recibidas": venue.total, Abiertas: venue.open, "En revisión": venue.inReview, Resueltas: venue.resolved, "Tasa de resolución": `${venue.resolutionRate}%`, "Respuesta media (minutos)": venue.averageResponseMinutes, "SLA evaluadas": venue.slaEvaluated, "Cumplen SLA": venue.slaMet, "SLA vencidas": venue.slaBreached, "Cumplimiento SLA": `${venue.slaComplianceRate}%`, "Cumplimiento SLA anterior": `${venue.previousSlaComplianceRate}%`, "Variación SLA (pp)": `${venue.slaComplianceChange >= 0 ? "+" : ""}${venue.slaComplianceChange} pp`, "Estado de riesgo SLA": getSlaRiskLabel(venue.slaComplianceChange), "Tipo PQRS": filters.typeLabel, "Estado PQRS": filters.statusLabel })); }

export function createPqrsCsv(rows: PqrsExportRow[], dateFrom?: Date, dateTo?: Date) {
  const headers = Object.keys(rows[0] ?? ({} as PqrsExportRow));
  const periodSummary = dateFrom && dateTo ? [["Reporte de desempeño PQRS · SongTap"], ["Periodo desde", dateFrom.toISOString().slice(0, 10)], ["Periodo hasta", dateTo.toISOString().slice(0, 10)], []] : [];
  return [...periodSummary, headers, ...rows.map((row) => headers.map((header) => row[header as keyof PqrsExportRow]))].map((record) => record.map(escapeCsvCell).join(",")).join("\n");
}

export function createPqrsWorkbook(rows: PqrsExportRow[], totals: PqrsAnalyticsTotals, dateFrom: Date, dateTo: Date, filters: PqrsExportFilters = { typeLabel: "Todos los tipos", statusLabel: "Todos los estados" }): XlsxWorkbookDefinition {
  const summary = [["Reporte de desempeño PQRS · SongTap"], ["Generado", new Date().toLocaleString("es-CO")], ["Periodo desde", dateFrom.toLocaleDateString("es-CO")], ["Periodo hasta", dateTo.toLocaleDateString("es-CO")], ["Tipo PQRS", filters.typeLabel], ["Estado PQRS", filters.statusLabel], ["PQRS recibidas", totals.total], ["Abiertas", totals.open], ["En revisión", totals.inReview], ["Resueltas", totals.resolved], ["Tasa de resolución", `${totals.resolutionRate}%`], ["SLA evaluadas", totals.slaEvaluated], ["Cumplen SLA", totals.slaMet], ["SLA vencidas", totals.slaBreached], ["Cumplimiento SLA", `${totals.slaComplianceRate}%`], ["Cumplimiento SLA anterior", `${totals.previousSlaComplianceRate}%`], ["Variación SLA", `${totals.slaComplianceChange >= 0 ? "+" : ""}${totals.slaComplianceChange} pp`], ["Estado de riesgo SLA", getSlaRiskLabel(totals.slaComplianceChange)]];
  return { sheets: [{ name: "Resumen", rows: summary, columnWidths: [28, 34] }, { name: "Locales", rows: rowsFromRecords(rows), columnWidths: [28, 12, 18, 12, 16, 14, 20, 27, 14, 14, 14, 18, 22, 18, 22, 20, 20], autoFilter: true }] };
}

export function buildPqrsFilename(extension: "csv" | "xlsx", date = new Date()) { return `songtap-desempeno-pqrs-${date.toISOString().slice(0, 10)}.${extension}`; }
export function downloadPqrsWorkbook(rows: PqrsExportRow[], totals: PqrsAnalyticsTotals, dateFrom: Date, dateTo: Date, filters: PqrsExportFilters) { return downloadXlsxWorkbook(createPqrsWorkbook(rows, totals, dateFrom, dateTo, filters), buildPqrsFilename("xlsx")); }
