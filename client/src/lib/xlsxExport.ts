export type SpreadsheetCell = string | number | boolean | null | undefined;

export type XlsxSheetDefinition = {
  name: string;
  rows: SpreadsheetCell[][];
  columnWidths?: number[];
  autoFilter?: boolean;
};

export type XlsxWorkbookDefinition = {
  sheets: XlsxSheetDefinition[];
};

const FORMULA_PREFIX = /^[\t\r\n ]*[=+\-@]/;

/** Evita que texto controlado por usuarios sea interpretado como fórmula en hojas de cálculo. */
export function protectSpreadsheetCell(value: SpreadsheetCell): SpreadsheetCell {
  if (typeof value !== "string") return value;
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function rowsFromRecords<T extends Record<string, SpreadsheetCell>>(records: T[]) {
  const headers = Array.from(new Set(records.flatMap((record) => Object.keys(record))));
  return [headers, ...records.map((record) => headers.map((header) => record[header]))];
}

export function escapeCsvCell(value: SpreadsheetCell) {
  return `"${String(protectSpreadsheetCell(value) ?? "").replaceAll('"', '""')}"`;
}

/**
 * Carga ExcelJS solo al solicitar una descarga. Esto reduce el JavaScript inicial y
 * evita mantener el parser XLSX legado dentro del paquete principal de SongTap.
 */
export async function downloadXlsxWorkbook(definition: XlsxWorkbookDefinition, filename: string) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SongTap";
  workbook.created = new Date();

  definition.sheets.forEach((sheetDefinition) => {
    const sheet = workbook.addWorksheet(sheetDefinition.name);
    sheet.addRows(sheetDefinition.rows.map((row) => row.map(protectSpreadsheetCell)));
    if (sheetDefinition.columnWidths?.length) {
      sheet.columns = sheetDefinition.columnWidths.map((width) => ({ width }));
    }
    if (sheetDefinition.autoFilter && sheetDefinition.rows.length > 1 && sheetDefinition.rows[0]?.length) {
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: sheetDefinition.rows.length, column: sheetDefinition.rows[0].length },
      };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  link.click();
  URL.revokeObjectURL(objectUrl);
}
