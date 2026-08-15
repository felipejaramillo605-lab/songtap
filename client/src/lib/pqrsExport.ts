import * as XLSX from "xlsx";

export type PqrsAnalyticsVenue = {
  venueId: number;
  venueName: string;
  total: number;
  open: number;
  inReview: number;
  resolved: number;
  resolutionRate: number;
  averageResponseMinutes: number;
  slaEvaluated: number;
  slaMet: number;
  slaBreached: number;
  slaComplianceRate: number;
  previousSlaComplianceRate: number;
  slaComplianceChange: number;
};

export type PqrsAnalyticsTotals = Pick<PqrsAnalyticsVenue, "total" | "open" | "inReview" | "resolved" | "resolutionRate" | "slaEvaluated" | "slaMet" | "slaBreached" | "slaComplianceRate" | "previousSlaComplianceRate" | "slaComplianceChange">;

export type PqrsExportRow = {
  Local: string;
  "ID local": number;
  "PQRS recibidas": number;
  Abiertas: number;
  "En revisión": number;
  Resueltas: number;
  "Tasa de resolución": string;
  "Respuesta media (minutos)": number;
  "SLA evaluadas": number;
  "Cumplen SLA": number;
  "SLA vencidas": number;
  "Cumplimiento SLA": string;
  "Cumplimiento SLA anterior": string;
  "Variación SLA (pp)": string;
  "Tipo PQRS": string;
  "Estado PQRS": string;
};

export type PqrsExportFilters = { typeLabel: string; statusLabel: string };

export function toPqrsExportRows(venues: PqrsAnalyticsVenue[], filters: PqrsExportFilters = { typeLabel: "Todos los tipos", statusLabel: "Todos los estados" }): PqrsExportRow[] {
  return venues.map((venue) => ({
    Local: venue.venueName,
    "ID local": venue.venueId,
    "PQRS recibidas": venue.total,
    Abiertas: venue.open,
    "En revisión": venue.inReview,
    Resueltas: venue.resolved,
    "Tasa de resolución": `${venue.resolutionRate}%`,
    "Respuesta media (minutos)": venue.averageResponseMinutes,
    "SLA evaluadas": venue.slaEvaluated,
    "Cumplen SLA": venue.slaMet,
    "SLA vencidas": venue.slaBreached,
    "Cumplimiento SLA": `${venue.slaComplianceRate}%`,
    "Cumplimiento SLA anterior": `${venue.previousSlaComplianceRate}%`,
    "Variación SLA (pp)": `${venue.slaComplianceChange >= 0 ? "+" : ""}${venue.slaComplianceChange} pp`,
    "Tipo PQRS": filters.typeLabel,
    "Estado PQRS": filters.statusLabel,
  }));
}

export function createPqrsCsv(rows: PqrsExportRow[], dateFrom?: Date, dateTo?: Date) {
  const headers = Object.keys(rows[0] ?? ({} as PqrsExportRow));
  const escapeCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const periodSummary = dateFrom && dateTo ? [
    ["Reporte de desempeño PQRS · SongTap"],
    ["Periodo desde", dateFrom.toISOString().slice(0, 10)],
    ["Periodo hasta", dateTo.toISOString().slice(0, 10)],
    [],
  ] : [];
  return [...periodSummary, headers, ...rows.map((row) => headers.map((header) => row[header as keyof PqrsExportRow]))]
    .map((record) => record.map(escapeCell).join(","))
    .join("\n");
}

export function createPqrsWorkbook(rows: PqrsExportRow[], totals: PqrsAnalyticsTotals, dateFrom: Date, dateTo: Date, filters: PqrsExportFilters = { typeLabel: "Todos los tipos", statusLabel: "Todos los estados" }) {
  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([
    ["Reporte de desempeño PQRS · SongTap"],
    ["Generado", new Date().toLocaleString("es-CO")],
    ["Periodo desde", dateFrom.toLocaleDateString("es-CO")],
    ["Periodo hasta", dateTo.toLocaleDateString("es-CO")],
    ["Tipo PQRS", filters.typeLabel],
    ["Estado PQRS", filters.statusLabel],
    ["PQRS recibidas", totals.total],
    ["Abiertas", totals.open],
    ["En revisión", totals.inReview],
    ["Resueltas", totals.resolved],
    ["Tasa de resolución", `${totals.resolutionRate}%`],
    ["SLA evaluadas", totals.slaEvaluated],
    ["Cumplen SLA", totals.slaMet],
    ["SLA vencidas", totals.slaBreached],
    ["Cumplimiento SLA", `${totals.slaComplianceRate}%`],
    ["Cumplimiento SLA anterior", `${totals.previousSlaComplianceRate}%`],
    ["Variación SLA", `${totals.slaComplianceChange >= 0 ? "+" : ""}${totals.slaComplianceChange} pp`],
  ]);
  summary["!cols"] = [{ wch: 28 }, { wch: 34 }];
  const venues = XLSX.utils.json_to_sheet(rows);
  venues["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 27 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 20 }];
  venues["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 15, r: Math.max(rows.length, 1) } }) };
  XLSX.utils.book_append_sheet(workbook, summary, "Resumen");
  XLSX.utils.book_append_sheet(workbook, venues, "Locales");
  return workbook;
}

export function buildPqrsFilename(extension: "csv" | "xlsx", date = new Date()) {
  return `songtap-desempeno-pqrs-${date.toISOString().slice(0, 10)}.${extension}`;
}
