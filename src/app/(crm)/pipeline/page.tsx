"use client";

import { CalendarDays, Eye, List, MoreHorizontal, Pencil, Percent, Plus, Search, Target, Trash2, Trophy, Wallet, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { deleteRecord } from "@/components/crm/shared";
import { Menu } from "@/components/ui/overlay";
import { Avatar, Badge, Button, Card, IconTile, Input, PageHeader, Select } from "@/components/ui/primitives";
import { PRIORITY_TONE, STAGES, type Tone } from "@/lib/constants";
import { useData, useDebounced, useLookup, useMoney } from "@/lib/hooks";
import { dealStats, isOpen } from "@/lib/metrics";
import { useCRM } from "@/lib/store";
import type { Deal, DealStage } from "@/lib/types";
import { openDeal, openForm, toast } from "@/lib/ui-store";
import { cn, DAY, formatDate, startOfDay } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

function Metric({ icon, tone, label, value, hint }: { icon: LucideIcon; tone: Tone; label: string; value: string; hint?: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-lg font-semibold tracking-tight text-fg">{value}</p>
        {hint && <p className="truncate text-[11px] text-subtle">{hint}</p>}
      </div>
    </Card>
  );
}

function DealCard({ deal, onDragStart, dragging }: { deal: Deal; onDragStart: (id: string | null) => void; dragging: boolean }) {
  const lookup = useLookup();
  const money = useMoney();
  const moveDeal = useCRM((s) => s.moveDeal);
  const owner = lookup.users.get(deal.ownerId);
  const company = lookup.companies.get(deal.companyId ?? "");
  const today = startOfDay().getTime();
  const close = new Date(deal.closeDate).getTime();
  const late = isOpen(deal) && close < today;
  const soon = isOpen(deal) && !late && close < today + 7 * DAY;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", deal.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(deal.id);
      }}
      onDragEnd={() => onDragStart(null)}
      onClick={() => openDeal(deal.id)}
      className={cn(
        "group cursor-grab rounded-xl border border-line bg-surface p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop active:cursor-grabbing",
        dragging && "rotate-1 opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{deal.name}</p>
          <p className="truncate text-xs text-muted">{company?.name ?? "No company"}</p>
        </div>
        <Menu
          width="w-44"
          trigger={(p) => <Button {...p} variant="ghost" size="icon-sm" icon={MoreHorizontal} aria-label="Deal actions" className="-mt-1 -mr-1.5 opacity-0 group-hover:opacity-100" />}
          items={[
            { label: "Open", icon: Eye, onSelect: () => openDeal(deal.id) },
            { label: "Edit", icon: Pencil, onSelect: () => openForm("deal", { id: deal.id }) },
            ...(isOpen(deal)
              ? [
                  { label: "Mark won", icon: Trophy, onSelect: () => { moveDeal(deal.id, "won"); toast.success("Deal won 🎉", deal.name); } },
                  { label: "Mark lost", icon: XCircle, onSelect: () => { moveDeal(deal.id, "lost"); toast.info("Deal marked lost", deal.name); } },
                ]
              : []),
            "divider" as const,
            { label: "Delete", icon: Trash2, danger: true, onSelect: () => deleteRecord("deal", deal.id, deal.name) },
          ]}
        />
      </div>
      <p className="mt-2.5 text-base font-semibold tracking-tight text-fg">{money.full(deal.amount)}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge tone={PRIORITY_TONE[deal.priority]} className="py-0">{deal.priority}</Badge>
          <span className={cn("flex items-center gap-1 text-[11px]", late ? "font-medium text-tone-red" : soon ? "font-medium text-tone-amber" : "text-muted")}>
            <CalendarDays className="h-3 w-3" />
            {formatDate(deal.closeDate, { day: "numeric", month: "short" })}
          </span>
        </div>
        {owner && <Avatar name={owner.name} color={owner.color} size={22} />}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const data = useData();
  const money = useMoney();
  const lookup = useLookup();
  const moveDeal = useCRM((s) => s.moveDeal);
  const [owner, setOwner] = useState("");
  const [q, setQ] = useState("");
  const [showClosed, setShowClosed] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<DealStage | null>(null);
  const query = useDebounced(q).trim().toLowerCase();

  const deals = useMemo(
    () =>
      data.deals.filter(
        (d) =>
          (!owner || d.ownerId === owner) &&
          (!query || [d.name, lookup.companies.get(d.companyId ?? "")?.name ?? ""].some((x) => x.toLowerCase().includes(query))),
      ),
    [data.deals, owner, query, lookup],
  );
  const stats = dealStats(deals);
  const columns = STAGES.filter((s) => showClosed || (s.id !== "won" && s.id !== "lost"));

  const drop = (stage: DealStage) => {
    const id = dragId;
    setDragId(null);
    setOver(null);
    const deal = data.deals.find((d) => d.id === id);
    if (!deal || deal.stage === stage) return;
    moveDeal(deal.id, stage);
    const label = STAGES.find((s) => s.id === stage)!.label;
    if (stage === "won") toast.success("Deal won 🎉", `${deal.name} · ${money.full(deal.amount)}`);
    else toast.success(`Moved to ${label}`, deal.name);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Pipeline"
        description="Drag deals between stages to update them. Metrics update instantly."
        actions={
          <>
            <Link href="/deals"><Button icon={List}>List view</Button></Link>
            <Button variant="primary" icon={Plus} onClick={() => openForm("deal")}>New deal</Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric icon={Wallet} tone="blue" label="Total pipeline" value={money.compact(stats.pipelineValue)} hint={`${stats.openCount} open deals`} />
        <Metric icon={Target} tone="violet" label="Weighted pipeline" value={money.compact(stats.weightedValue)} hint="Amount × probability" />
        <Metric icon={List} tone="cyan" label="Open deals" value={String(stats.openCount)} />
        <Metric icon={Trophy} tone="green" label="Won value" value={money.compact(stats.wonValue)} hint={`${stats.wonCount} deals`} />
        <Metric icon={Percent} tone="amber" label="Win rate" value={`${Math.round(stats.winRate)}%`} hint={`${stats.wonCount} won · ${stats.lostCount} lost`} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter deals…" className="pl-9" />
        </div>
        <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-auto">
          <option value="">All owners</option>
          {data.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-fg-2">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="accent-[var(--primary)]" />
          Show won / lost
        </label>
      </div>

      <div className="scroll-thin -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 md:-mx-6 md:px-6">
        {columns.map((stage) => {
          const items = deals.filter((d) => d.stage === stage.id);
          items.sort((a, b) => a.closeDate.localeCompare(b.closeDate));
          const value = items.reduce((s, d) => s + d.amount, 0);
          const isOver = over === stage.id && dragId && data.deals.find((d) => d.id === dragId)?.stage !== stage.id;
          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (over !== stage.id) setOver(stage.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                drop(stage.id);
              }}
              className={cn(
                "flex w-[272px] shrink-0 flex-col rounded-2xl border bg-surface-2/60 transition-colors",
                isOver ? "border-primary bg-primary-soft/50" : "border-line",
              )}
            >
              <div className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
                    <span className="text-sm font-semibold text-fg">{stage.label}</span>
                    <span className="rounded-full bg-surface px-1.5 text-xs font-medium text-muted">{items.length}</span>
                  </div>
                  <Button variant="ghost" size="icon-sm" icon={Plus} aria-label={`Add deal to ${stage.label}`} onClick={() => openForm("deal", { defaults: { stage: stage.id, probability: stage.probability } })} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {money.compact(value)}
                </p>
                <div className="mt-2 h-1 rounded-full" style={{ background: stage.color, opacity: 0.7 }} />
              </div>
              <div className="scroll-thin flex min-h-[120px] flex-1 flex-col gap-2.5 overflow-y-auto p-3 pt-1 lg:max-h-[calc(100vh-420px)]">
                {items.map((d) => <DealCard key={d.id} deal={d} onDragStart={setDragId} dragging={dragId === d.id} />)}
                {items.length === 0 && (
                  <div className={cn("flex flex-1 items-center justify-center rounded-xl border-2 border-dashed py-8 text-xs", isOver ? "border-primary text-primary" : "border-line text-subtle")}>
                    Drop deals here
                  </div>
                )}
              </div>
              <button
                onClick={() => openForm("deal", { defaults: { stage: stage.id, probability: stage.probability } })}
                className="m-3 mt-0 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" /> Add deal
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
