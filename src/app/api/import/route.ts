import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { parseCSV } from "@/lib/import/csv";
import { importHubSpot } from "@/lib/import/hubspot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "Data");

/** Team → companies → contacts → deals → tickets → activities → line items. */
function rank(rows: Record<string, string>[]) {
  const cols = new Set(Object.keys(rows[0] ?? {}));
  const has = (...k: string[]) => k.some((x) => cols.has(x));
  if (has("user email")) return 0;
  if (has("quantity")) return 6;
  if (has("call title", "meeting name", "email subject", "note body", "task title")) return 5;
  if (has("ticket name")) return 4;
  if (has("deal name")) return 3;
  if (has("first name", "last name", "email", "email address")) return 2;
  return 1;
}

/** Reads every CSV in /Data and returns the merged CRM dataset. */
export async function GET() {
  try {
    const names = (await readdir(DATA_DIR)).filter((f) => f.toLowerCase().endsWith(".csv"));
    const files = await Promise.all(
      names.map(async (name) => {
        const text = await readFile(path.join(DATA_DIR, name), "utf8");
        return { name, text, rows: parseCSV(text) };
      }),
    );
    // Import in dependency order so records exist before rows that reference them.
    files.sort((a, b) => rank(a.rows) - rank(b.rows) || a.name.localeCompare(b.name));
    return NextResponse.json(importHubSpot(files));
  } catch (err) {
    return NextResponse.json({ error: `Could not read CSV files from ${DATA_DIR}: ${(err as Error).message}` }, { status: 500 });
  }
}
