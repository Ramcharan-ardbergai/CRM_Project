"use client";

import { Download, GitBranch, Kanban, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CompanyLink, ContactLink, deleteRecord, OwnerCell, PriorityBadge, RowActions, StageBadge } from "@/components/crm/shared";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Menu } from "@/components/ui/overlay";
import { Button, Input, PageHeader, Select, Tabs } from "@/components/ui/primitives";
import { PRIORITIES, STAGES } from "@/lib/constants";
import { useData, useDebounced, useLookup, useMoney } from "@/lib/hooks";
import { dealStats, isOpen } from "@/lib/metrics";
import { useCRM } from "@/lib/store";
import type { Deal } from "@/lib/types";
import { openDeal, openForm, toast } from "@/lib/ui-store";
import { cn, downloadCSV, formatDate, startOfDay } from "@/lib/utils";

type View = "all" | "open" | "won" | "lost";

export default function DealsPage() {
  const data = useData();
  const lookup = useLookup();
  const money = useMoney();
  const moveDeal = useCRM((s) => s.moveDeal);
  const [view, setView] = useState<View>("open");
  const [stage, setStage] = useState("");
  const [owner, setOwner] = useState("");
  const [priority, setPriority] = useState("");
  const [q, setQ] = useState("");
  const query = useDebounced(q).trim().toLowerCase();

  const rows = useMemo(
    () =>
      data.deals.filter((d) => {
        if (view === "open" && !isOpen(d)) return false;
        if ((view === "won" || view === "lost") && d.stage !== view) return false;
        if (stage && d.stage !== stage) return false;
        if (owner && d.ownerId !== owner) return false;
        if (priority && d.priority !== priority) return false;
        if (!query) return true;
        return [d.name, lookup.companies.get(d.companyId ?? "")?.name ?? ""].some((x) => x.toLowerCase().includes(query));
      }),
    [data.deals, view, stage, owner, priority, query, lookup],
  );
  const stats = dealStats(rows);
  const total = rows.reduce((s, d) => s + d.amount, 0);
  const today = startOfDay().getTime();

  const columns: Column<Deal>[] = [
    {
      id: "name",
      header: "Deal",
      sortValue: (d) => d.name,
      cell: (d) => (
        <div>
          <p className="font-medium text-fg group-hover:text-primary">{d.name}</p>
          <CompanyLink id={d.companyId} className="text-xs text-muted" />
        </div>
      ),
    },
    { id: "contact", header: "Contact", hideable: true, cell: (d) => <ContactLink id={d.contactId} /> },
    { id: "amount", header: "Amount", align: "right", sortValue: (d) => d.amount, cell: (d) => <span className="font-semibold text-fg">{money.full(d.amount)}</span> },
    { id: "stage", header: "Stage", sortValue: (d) => STAGES.findIndex((s) => s.id === d.stage), cell: (d) => <StageBadge stage={d.stage} /> },
    { id: "probability", header: "Prob.", hideable: true, align: "right", sortValue: (d) => d.probability, cell: (d) => `${d.probability}%` },
    {
      id: "close",
      header: "Expected Close",
      hideable: true,
      sortValue: (d) => d.closeDate,
      cell: (d) => {
        const late = isOpen(d) && new Date(d.closeDate).getTime() < today;
        return <span className={cn(late && "font-medium text-tone-red")}>{formatDate(d.closeDate)}{late && " · overdue"}</span>;
      },
    },
    { id: "priority", header: "Priority", hideable: true, sortValue: (d) => PRIORITIES.indexOf(d.priority), cell: (d) => <PriorityBadge priority={d.priority} /> },
    { id: "owner", header: "Owner", hideable: true, sortValue: (d) => lookup.users.get(d.ownerId)?.name ?? "", cell: (d) => <OwnerCell userId={d.ownerId} /> },
    { id: "created", header: "Created", hideable: true, defaultHidden: true, sortValue: (d) => d.createdAt, cell: (d) => formatDate(d.createdAt) },
    { id: "actions", header: "", className: "w-10", cell: (d) => <RowActions kind="deal" id={d.id} name={d.name} /> },
  ];

  return (
    <>
      <PageHeader
        title="Deals"
        description="Track every opportunity from first touch to close."
        actions={
          <>
            <Link href="/pipeline"><Button icon={Kanban}>Board view</Button></Link>
            <Button
              icon={Download}
              onClick={() => {
                downloadCSV("deals.csv", [
                  ["Deal", "Company", "Amount", "Stage", "Probability", "Close date", "Priority", "Owner"],
                  ...rows.map((d) => [d.name, lookup.companies.get(d.companyId ?? "")?.name ?? "", d.amount, d.stage, d.probability, formatDate(d.closeDate), d.priority, lookup.users.get(d.ownerId)?.name ?? ""]),
                ]);
                toast.success("Export ready", `${rows.length} deals exported`);
              }}
            >
              Export
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => openForm("deal")}>New deal</Button>
          </>
        }
      />

      <Tabs
        className="mb-4"
        value={view}
        onChange={setView}
        tabs={[
          { id: "open", label: "Open", count: data.deals.filter(isOpen).length },
          { id: "won", label: "Won", count: data.deals.filter((d) => d.stage === "won").length },
          { id: "lost", label: "Lost", count: data.deals.filter((d) => d.stage === "lost").length },
          { id: "all", label: "All deals", count: data.deals.length },
        ]}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Total value", money.compact(total)],
          [view === "open" ? "Weighted value" : "Avg deal size", view === "open" ? money.compact(stats.weightedValue) : money.compact(rows.length ? total / rows.length : 0)],
          ["Deals", rows.length],
          ["High priority", rows.filter((d) => d.priority === "High").length],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-0.5 text-lg font-semibold text-fg">{value}</p>
          </div>
        ))}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        getId={(d) => d.id}
        onRowClick={(d) => openDeal(d.id)}
        initialSort={{ id: "close", dir: "asc" }}
        toolbar={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search deals or companies…" className="pl-9" />
            </div>
            <Select value={stage} onChange={(e) => setStage(e.target.value)} className="w-auto">
              <option value="">All stages</option>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-auto">
              <option value="">Any priority</option>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </Select>
            <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-auto">
              <option value="">All owners</option>
              {data.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </>
        }
        bulkActions={(ids, clear) => (
          <>
            <Menu
              align="left"
              trigger={(p) => <Button size="sm" icon={GitBranch} {...p}>Move to stage</Button>}
              items={STAGES.map((s) => ({
                label: s.label,
                onSelect: () => {
                  ids.forEach((id) => moveDeal(id, s.id));
                  toast.success(`${ids.length} deals moved`, `Now in ${s.label}`);
                  clear();
                },
              }))}
            />
            <Button size="sm" icon={Trash2} className="text-[var(--red)]" onClick={() => deleteRecord("deal", ids, "", clear)}>Delete</Button>
          </>
        )}
      />
    </>
  );
}
