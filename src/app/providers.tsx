"use client";

import { AlertTriangle, FileSpreadsheet } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/primitives";
import { ConfirmHost, Toaster } from "@/components/ui/overlay";
import { useHydrated } from "@/lib/hooks";
import { useCRM } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  const theme = useCRM((s) => s.settings.theme);
  const importedAt = useCRM((s) => s.importedAt);
  const importFromCSV = useCRM((s) => s.importFromCSV);
  const hydrated = useHydrated();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    // Wait for persisted settings so we don't override the pre-paint theme.
    if (hydrated) document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme, hydrated]);

  const runImport = useCallback(() => {
    setError("");
    importFromCSV().catch((e: Error) => setError(e.message));
  }, [importFromCSV]);

  // First visit: load the dataset from the CSV files in /Data.
  useEffect(() => {
    if (hydrated && !importedAt && !started.current) {
      started.current = true;
      runImport();
    }
  }, [hydrated, importedAt, runImport]);

  let content = children;
  if (hydrated && !importedAt) {
    content = (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        {error ? (
          <>
            <span className="tone-red flex h-12 w-12 items-center justify-center rounded-2xl"><AlertTriangle className="h-6 w-6" /></span>
            <div>
              <p className="font-semibold text-fg">Couldn&apos;t import the CSV data</p>
              <p className="mt-1 max-w-md text-sm text-muted">{error}</p>
            </div>
            <Button variant="primary" onClick={runImport}>Try again</Button>
          </>
        ) : (
          <>
            <span className="tone-blue flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl"><FileSpreadsheet className="h-6 w-6" /></span>
            <p className="text-sm text-muted">Importing records from the CSV files in <code className="rounded bg-surface-2 px-1">Data/</code>…</p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {content}
      <Toaster />
      <ConfirmHost />
    </>
  );
}
