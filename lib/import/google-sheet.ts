/**
 * Reads a published Google Sheet tab through the gviz CSV endpoint — the same
 * approach the club's existing finance dashboard uses, so no API key or
 * service account is needed as long as the sheet stays link-readable.
 */
export async function fetchSheetCsv(sheetId: string, sheetName?: string): Promise<string[][]> {
  const url =
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv` +
    (sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : "");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not read sheet "${sheetName ?? "default"}" (HTTP ${res.status}).`);
  return parseCsv(await res.text());
}

/** Minimal RFC-4180 CSV reader: handles quoted cells, escaped quotes, and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;

  while (i < text.length) {
    const row: string[] = [];
    while (i < text.length && text[i] !== "\n" && text[i] !== "\r") {
      let cell = "";
      if (text[i] === '"') {
        i++;
        while (i < text.length) {
          if (text[i] === '"' && text[i + 1] === '"') {
            cell += '"';
            i += 2;
          } else if (text[i] === '"') {
            i++;
            break;
          } else {
            cell += text[i++];
          }
        }
      } else {
        while (i < text.length && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          cell += text[i++];
        }
      }
      row.push(cell.trim());
      if (i < text.length && text[i] === ",") i++;
    }
    if (text[i] === "\r") i++;
    if (text[i] === "\n") i++;
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c !== ""));
}

/** "Oct-25" → "2025-10", matching the ledger's feeMonth format. */
export function parseSheetMonth(label: string): string | null {
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const match = label.trim().toLowerCase().match(/^([a-z]{3})[-\s]?(\d{2,4})$/);
  if (!match) return null;
  const month = months[match[1]];
  if (!month) return null;
  const year = match[2].length === 2 ? `20${match[2]}` : match[2];
  return `${year}-${month}`;
}

export function parseAmount(raw: string): number {
  const n = Number.parseFloat(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}
