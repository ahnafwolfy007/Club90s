import Papa from "papaparse";
import ExcelJS from "exceljs";

/** Parses a CSV or XLSX file into an array of plain objects keyed by the header row. */
export async function parseSpreadsheet(file: File): Promise<Record<string, string>[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    const text = await file.text();
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    return result.data;
  }

  if (name.endsWith(".xlsx")) {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber] = String(cell.value ?? "").trim();
    });

    const rows: Record<string, string>[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: Record<string, string> = {};
      let hasValue = false;
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (!header) return;
        const value = cellToString(cell.value);
        if (value !== "") hasValue = true;
        obj[header] = value;
      });
      if (hasValue) rows.push(obj);
    });
    return rows;
  }

  throw new Error("Unsupported file type. Upload a .csv or .xlsx file.");
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text ?? "");
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result ?? "");
  return String(value).trim();
}
