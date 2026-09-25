"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Columns3, Inbox, Square, SquareCheck } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Menu } from "./overlay";
import { Button, Card, Checkbox, EmptyState, Select } from "./primitives";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  align?: "right";
  /** Column can be hidden from the column menu. */
  hideable?: boolean;
  defaultHidden?: boolean;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  getId: (row: T) => string;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  bulkActions?: (ids: string[], clear: () => void) => ReactNode;
  initialSort?: { id: string; dir: "asc" | "desc" };
  empty?: ReactNode;
  pageSize?: number;
}

export function DataTable<T>({ rows, columns, getId, onRowClick, toolbar, bulkActions, initialSort, empty, pageSize: initialPageSize = 10 }: Props<T>) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id)));

  const visible = columns.filter((c) => !hidden.has(c.id));

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return rows;
    const dir = sort!.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = col.sortValue!(a), y = col.sortValue!(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    if (page >= pages) setPage(pages - 1);
  }, [page, pages]);
  // Drop selections for rows that no longer exist (e.g. after delete or filter).
  useEffect(() => {
    const ids = new Set(rows.map(getId));
    setSelected((s) => {
      const next = new Set([...s].filter((id) => ids.has(id)));
      return next.size === s.size ? s : next;
    });
  }, [rows, getId]);

  const pageRows = sorted.slice(page * pageSize, page * pageSize + pageSize);
  const pageIds = pageRows.map(getId);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPage = pageIds.some((id) => selected.has(id));

  const toggleSort = (c: Column<T>) => {
    if (!c.sortValue) return;
    setSort((s) => (s?.id !== c.id ? { id: c.id, dir: "asc" } : s.dir === "asc" ? { id: c.id, dir: "desc" } : null));
  };

  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  return (
    <Card className="overflow-hidden">
      <div className="flex min-h-[60px] flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        {bulkActions && selected.size > 0 ? (
          <div className="flex flex-1 animate-fade-in flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-medium text-fg">{selected.size} selected</span>
            {bulkActions([...selected], () => setSelected(new Set()))}
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-wrap items-center gap-2">{toolbar}</div>
        )}
        {columns.some((c) => c.hideable) && (
          <Menu
            width="w-48"
            trigger={(p) => <Button size="sm" icon={Columns3} {...p}>Columns</Button>}
            items={columns
              .filter((c) => c.hideable)
              .map((c) => ({
                label: c.header,
                icon: hidden.has(c.id) ? Square : SquareCheck,
                onSelect: () =>
                  setHidden((h) => {
                    const n = new Set(h);
                    if (n.has(c.id)) n.delete(c.id);
                    else n.add(c.id);
                    return n;
                  }),
              }))}
          />
        )}
      </div>

      {rows.length === 0 ? (
        empty ?? <EmptyState icon={Inbox} title="No records found" description="Try adjusting your search or filters." />
      ) : (
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2/60">
                {bulkActions && (
                  <th className="w-10 py-2.5 pl-4">
                    <Checkbox
                      label="Select page"
                      checked={allOnPage}
                      indeterminate={!allOnPage && someOnPage}
                      onChange={(on) => pageIds.forEach((id) => toggle(id, on))}
                    />
                  </th>
                )}
                {visible.map((c) => (
                  <th
                    key={c.id}
                    onClick={() => toggleSort(c)}
                    className={cn(
                      "px-4 py-2.5 text-left text-xs font-medium tracking-wide whitespace-nowrap text-muted uppercase select-none",
                      c.sortValue && "cursor-pointer hover:text-fg",
                      c.align === "right" && "text-right",
                      c.className,
                    )}
                  >
                    <span className={cn("inline-flex items-center gap-1", c.align === "right" && "flex-row-reverse")}>
                      {c.header}
                      {c.sortValue &&
                        (sort?.id === c.id ? (
                          sort.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        ))}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const id = getId(row);
                const isSel = selected.has(id);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "group border-b border-line transition-colors last:border-0",
                      onRowClick && "cursor-pointer",
                      isSel ? "bg-primary-soft/60" : "hover:bg-surface-2/70",
                    )}
                  >
                    {bulkActions && (
                      <td className="w-10 py-3 pl-4">
                        <Checkbox label="Select row" checked={isSel} onChange={(on) => toggle(id, on)} />
                      </td>
                    )}
                    {visible.map((c) => (
                      <td key={c.id} className={cn("px-4 py-3 whitespace-nowrap text-fg-2", c.align === "right" && "text-right", c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px] text-muted">
          <div className="flex items-center gap-2">
            <span>Rows</span>
            <Select value={pageSize} onChange={(e) => { setPageSize(+e.target.value); setPage(0); }} className="h-8 w-[70px] text-[13px]">
              {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
            <span className="ml-2">
              {page * pageSize + 1}–{Math.min(sorted.length, (page + 1) * pageSize)} of {sorted.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="ghost" icon={ChevronLeft} disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page" />
            {Array.from({ length: pages }, (_, i) => i)
              .filter((i) => i === 0 || i === pages - 1 || Math.abs(i - page) <= 1)
              .map((i, idx, arr) => (
                <span key={i} className="flex items-center">
                  {idx > 0 && arr[idx - 1]! < i - 1 && <span className="px-1">…</span>}
                  <button
                    onClick={() => setPage(i)}
                    className={cn("h-7 min-w-7 rounded-md px-2 text-[13px] font-medium", i === page ? "bg-primary text-white" : "hover:bg-surface-2 hover:text-fg")}
                  >
                    {i + 1}
                  </button>
                </span>
              ))}
            <Button size="icon-sm" variant="ghost" icon={ChevronRight} disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page" />
          </div>
        </div>
      )}
    </Card>
  );
}
