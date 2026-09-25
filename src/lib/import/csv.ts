/** Minimal RFC-4180 CSV parser with delimiter detection (`,` or `;`) and BOM stripping. */
export function parseCSV(text: string): Record<string, string>[] {
  text = text.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase());
  return body
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()]).filter(([k]) => k)));
}

/**
 * Parses the date formats found in HubSpot sample files:
 * M/D/YYYY, D/M/YYYY (when the first part is > 12), M/D/YY, with optional "HH:mm" or "h:mm AM/PM".
 */
export function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?$/i);
  if (!m) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  let [a, b] = [Number(m[1]), Number(m[2])];
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  const [month, day] = a > 12 ? [b, a] : [a, b];
  let hour = m[4] ? Number(m[4]) : 12;
  const minute = m[5] ? Number(m[5]) : 0;
  if (m[6]?.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (m[6]?.toUpperCase() === "AM" && hour === 12) hour = 0;
  const d = new Date(year, month - 1, day, hour, minute);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** "$3,760" → 3760 */
export const parseAmount = (v: string | undefined) => {
  const n = Number((v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
