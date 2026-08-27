import { downloadXlsxWorkbook, escapeCsvCell, rowsFromRecords, type XlsxWorkbookDefinition } from "./xlsxExport";

export type AuditExportRecord = {
  id: number;
  venueId: number | null;
  companyName: string | null;
  userId: number | null;
  executorName: string | null;
  executorEmail: string | null;
  userRole: string | null;
  module: string | null;
  action: string;
  entity: string | null;
  entityId: number | null;
  details: string | null;
  createdAt: Date | string;
};

export type AuditExportFilters = { company: string; module: string; user: string };

export type AuditExportRow = {
  "ID evento": number;
  Compañía: string;
  "ID compañía": string;
  Fecha: string;
  Hora: string;
  Módulo: string;
  "Usuario ejecutor": string;
  Correo: string;
  Rol: string;
  Acción: string;
  Entidad: string;
  "ID entidad": string;
  Detalle: string;
};

function parseDetails(details: string | null) {
  if (!details) return "Sin detalles adicionales";
  try {
    const parsed = JSON.parse(details);
    return typeof parsed === "string" ? parsed : Object.values(parsed).join(" · ");
  } catch {
    return details;
  }
}

function formatDate(value: Date | string) { return new Date(value).toLocaleDateString("es-CO"); }
function formatTime(value: Date | string) { return new Date(value).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false }); }

export function toAuditExportRows(logs: AuditExportRecord[]): AuditExportRow[] {
  return logs.map((log) => ({
    "ID evento": log.id, Compañía: log.companyName || "SongTap · Global", "ID compañía": log.venueId ? String(log.venueId) : "Global",
    Fecha: formatDate(log.createdAt), Hora: formatTime(log.createdAt), Módulo: log.module || "Sistema",
    "Usuario ejecutor": log.executorName || log.executorEmail || "Usuario no disponible", Correo: log.executorEmail || "No disponible",
    Rol: log.userRole || "Sin rol", Acción: log.action, Entidad: log.entity || "No especificada",
    "ID entidad": log.entityId ? String(log.entityId) : "No disponible", Detalle: parseDetails(log.details),
  }));
}

export function createAuditCsv(rows: AuditExportRow[]) {
  const headers = Object.keys(rows[0] ?? ({} as AuditExportRow));
  return [headers, ...rows.map((row) => headers.map((header) => row[header as keyof AuditExportRow]))]
    .map((record) => record.map(escapeCsvCell).join(","))
    .join("\n");
}

function readableFilter(value: string, fallback: string) { return value === "all" ? fallback : value; }

export function createAuditWorkbook(rows: AuditExportRow[], filters: AuditExportFilters): XlsxWorkbookDefinition {
  const summary = [
    ["Reporte de auditoría · SongTap"], ["Generado", new Date().toLocaleString("es-CO")], ["Eventos exportados", rows.length],
    ["Compañía", readableFilter(filters.company, "Todas las compañías")], ["Módulo", readableFilter(filters.module, "Todos los módulos")], ["Usuario", readableFilter(filters.user, "Todos los usuarios")],
  ];
  return {
    sheets: [
      { name: "Resumen", rows: summary, columnWidths: [24, 42] },
      { name: "Eventos", rows: rowsFromRecords(rows), columnWidths: [12, 28, 14, 14, 10, 24, 28, 34, 14, 24, 24, 14, 62], autoFilter: true },
    ],
  };
}

export function buildAuditFilename(extension: "csv" | "xlsx", date = new Date()) { return `songtap-auditoria-${date.toISOString().slice(0, 10)}.${extension}`; }

export function downloadAuditWorkbook(rows: AuditExportRow[], filters: AuditExportFilters) {
  return downloadXlsxWorkbook(createAuditWorkbook(rows, filters), buildAuditFilename("xlsx"));
}
