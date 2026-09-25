import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { parseCSV } from "@/lib/import/csv";
import { importHubSpot } from "@/lib/import/hubspot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "Data");

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
    // Line-item files add to deal amounts, so they run after the deals exist.
    const isLineItems = (f: (typeof files)[number]) => "quantity" in (f.rows[0] ?? {});
    files.sort((a, b) => Number(isLineItems(a)) - Number(isLineItems(b)) || a.name.localeCompare(b.name));
    return NextResponse.json(importHubSpot(files));
  } catch (err) {
    return NextResponse.json({ error: `Could not read CSV files from ${DATA_DIR}: ${(err as Error).message}` }, { status: 500 });
  }
}
