"use client";

import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface SearchOption {
  value: string;
  label: string;
  hint?: string;
}

/** A select with a search box. Optionally offers to create a new option from the typed text. */
export function SearchSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  emptyLabel,
  onCreate,
  createLabel = "Create",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  /** Label for the "none" choice; omit to disallow clearing. */
  emptyLabel?: string;
  /** Called with the typed text; should create the record and return its value. */
  onCreate?: (text: string) => string;
  createLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);
  const selected = options.find((o) => o.value === value);

  const term = q.trim().toLowerCase();
  const filtered = useMemo(
    () => (term ? options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(term)) : options),
    [options, term],
  );
  const canCreate = !!onCreate && !!term && !options.some((o) => o.label.toLowerCase() === term);
  // Rows: optional "none", filtered options, optional "create".
  const rows: ({ kind: "none" } | { kind: "opt"; opt: SearchOption } | { kind: "create" })[] = [
    ...(emptyLabel && !term ? [{ kind: "none" as const }] : []),
    ...filtered.slice(0, 80).map((opt) => ({ kind: "opt" as const, opt })),
    ...(canCreate ? [{ kind: "create" as const }] : []),
  ];

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && !popRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  useEffect(() => setActive(0), [q, open]);
  useEffect(() => {
    if (!open) setQ("");
  }, [open]);
  // The popover is portalled with fixed positioning so scrolling modals don't clip it.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const up = window.innerHeight - r.bottom < 320 && r.top > 320;
      setPos({ top: up ? r.top - 6 : r.bottom + 6, left: r.left, width: Math.max(r.width, 240), up });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-row="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (row: (typeof rows)[number] | undefined) => {
    if (!row) return;
    if (row.kind === "none") onChange("");
    else if (row.kind === "opt") onChange(row.opt.value);
    else onChange(onCreate!(q.trim()));
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || (e.key.length === 1 && /\S/.test(e.key))) {
            setOpen(true);
            if (e.key.length === 1) setQ(e.key);
            e.preventDefault();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 text-left text-sm transition-colors outline-none hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-[var(--ring)]"
      >
        <span className={cn("flex-1 truncate", selected ? "text-fg" : "text-subtle")}>{selected ? selected.label : emptyLabel ?? placeholder}</span>
        {selected && emptyLabel && (
          <span
            role="button"
            aria-label="Clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="rounded p-0.5 text-subtle hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-subtle" />
      </button>

      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{ position: "fixed", left: pos.left, width: pos.width, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
          className="z-[75] animate-pop-in overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
        >
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search className="h-4 w-4 text-subtle" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(rows.length - 1, a + 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
                if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); choose(rows[active]); }
                if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
              }}
              placeholder="Type to search…"
              className="h-10 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
            />
          </div>
          <div ref={listRef} role="listbox" className="scroll-thin max-h-60 overflow-y-auto p-1">
            {rows.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">No matches</p>}
            {rows.map((row, i) => (
              <button
                key={row.kind === "opt" ? row.opt.value : row.kind}
                type="button"
                data-row={i}
                role="option"
                aria-selected={row.kind === "opt" ? row.opt.value === value : row.kind === "none" ? !value : false}
                onMouseMove={() => setActive(i)}
                onClick={() => choose(row)}
                className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm", i === active ? "bg-primary-soft" : "")}
              >
                {row.kind === "create" ? (
                  <>
                    <Plus className="h-4 w-4 text-primary" />
                    <span className="flex-1 truncate font-medium text-primary">{createLabel} “{q.trim()}”</span>
                  </>
                ) : row.kind === "none" ? (
                  <>
                    <span className="flex-1 truncate text-muted">{emptyLabel}</span>
                    {!value && <Check className="h-4 w-4 text-primary" />}
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-fg">{row.opt.label}</span>
                      {row.opt.hint && <span className="block truncate text-xs text-muted">{row.opt.hint}</span>}
                    </span>
                    {row.opt.value === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
