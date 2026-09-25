"use client";

import { CalendarClock, ChevronLeft, ChevronRight, Plus, Search, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { ActivityIcon, ActivityItem } from "@/components/crm/shared";
import { Button, Card, CardHeader, EmptyState, Input, PageHeader, Segmented, Select, Tabs } from "@/components/ui/primitives";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { contactName, useData, useDebounced, useLookup } from "@/lib/hooks";
import type { Activity, ActivityType } from "@/lib/types";
import { openForm } from "@/lib/ui-store";
import { DAY, dayLabel, formatTime, isSameDay, startOfDay } from "@/lib/utils";

const PAGE = 30;

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  if (total <= 1) return null;
  return <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted"><span>Page {page + 1} of {total}</span><span className="flex gap-1"><Button size="icon-sm" variant="ghost" icon={ChevronLeft} disabled={!page} onClick={() => onChange(page - 1)} aria-label="Previous page" /><Button size="icon-sm" variant="ghost" icon={ChevronRight} disabled={page >= total - 1} onClick={() => onChange(page + 1)} aria-label="Next page" /></span></div>;
}

export default function ActivitiesPage() {
  const data = useData();
  const lookup = useLookup();
  const [type, setType] = useState<"all" | ActivityType>("all");
  const [status, setStatus] = useState<"all" | "planned" | "completed">("all");
  const [owner, setOwner] = useState("");
  const [q, setQ] = useState("");
  const [historyPage, setHistoryPage] = useState(0);
  const [upcomingPage, setUpcomingPage] = useState(0);
  const query = useDebounced(q).trim().toLowerCase();

  const filtered = useMemo(
    () =>
      data.activities.filter((a) => {
        if (type !== "all" && a.type !== type) return false;
        if (status !== "all" && a.status !== status) return false;
        if (owner && a.ownerId !== owner) return false;
        if (!query) return true;
        const c = a.contactId ? lookup.contacts.get(a.contactId) : undefined;
        return [a.subject, a.description, c ? contactName(c) : "", lookup.companies.get(a.companyId ?? "")?.name ?? ""].some((x) => x.toLowerCase().includes(query));
      }),
    [data.activities, type, status, owner, query, lookup],
  );

  const upcoming = useMemo(() => filtered.filter((a) => a.status === "planned").sort((a, b) => a.date.localeCompare(b.date)), [filtered]);
  const history = useMemo(() => filtered.filter((a) => a.status === "completed").sort((a, b) => b.date.localeCompare(a.date)), [filtered]);
  const upcomingPages = Math.max(1, Math.ceil(upcoming.length / PAGE));
  const historyPages = Math.max(1, Math.ceil(history.length / PAGE));

  const grouped = useMemo(() => {
    const groups: { label: string; items: Activity[] }[] = [];
    history.slice(historyPage * PAGE, (historyPage + 1) * PAGE).forEach((a) => {
      const label = dayLabel(a.date);
      const last = groups.at(-1);
      if (last?.label === label) last.items.push(a);
      else groups.push({ label, items: [a] });
    });
    return groups;
  }, [history, historyPage]);

  const today = filtered.filter((a) => isSameDay(a.date, new Date())).sort((a, b) => a.date.localeCompare(b.date));
  const weekAgo = startOfDay().getTime() - 6 * DAY;
  const weekCounts = ACTIVITY_TYPES.map((t) => ({
    ...t,
    count: filtered.filter((a) => a.type === t.id && a.status === "completed" && new Date(a.date).getTime() >= weekAgo).length,
  }));
  const weekMax = Math.max(1, ...weekCounts.map((w) => w.count));

  return (
    <>
      <PageHeader
        title="Activities"
        description="Calls, emails, meetings and notes across all your accounts."
        actions={<Button variant="primary" icon={Plus} onClick={() => openForm("activity")}>Log activity</Button>}
      />

      <Tabs
        className="mb-4"
        value={type}
        onChange={(v) => { setType(v); setHistoryPage(0); setUpcomingPage(0); }}
        tabs={[
          { id: "all", label: "All", count: data.activities.length },
          ...ACTIVITY_TYPES.map((t) => ({ id: t.id, label: `${t.label}s`, count: data.activities.filter((a) => a.type === t.id).length })),
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activities…" className="pl-9" />
        </div>
        <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-auto">
          <option value="">Everyone</option>
          {data.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
        <Segmented className="ml-auto" value={status} onChange={(v) => { setStatus(v); setHistoryPage(0); setUpcomingPage(0); }} options={[{ id: "all", label: "All" }, { id: "planned", label: "Planned" }, { id: "completed", label: "Completed" }]} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <div className="hidden">
            <div className="relative w-full sm:w-72">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activities…" className="pl-9" />
            </div>
            <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-auto">
              <option value="">Everyone</option>
              {data.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
            <Segmented className="ml-auto" value={status} onChange={setStatus} options={[{ id: "all", label: "All" }, { id: "planned", label: "Planned" }, { id: "completed", label: "Completed" }]} />
          </div>

          {filtered.length === 0 && (
            <Card>
              <EmptyState icon={Zap} title="No activities match" description="Try another filter or log a new activity." action={<Button variant="primary" icon={Plus} onClick={() => openForm("activity")}>Log activity</Button>} />
            </Card>
          )}

          {upcoming.length > 0 && (
            <Card>
              <CardHeader title="Upcoming" subtitle={`${upcoming.length} planned`} />
              <div className="space-y-5 px-5 pb-5">
                {upcoming.slice(upcomingPage * PAGE, (upcomingPage + 1) * PAGE).map((a) => <ActivityItem key={a.id} activity={a} />)}
              </div>
              <Pager page={upcomingPage} total={upcomingPages} onChange={setUpcomingPage} />
            </Card>
          )}

          {grouped.length > 0 && (
            <Card>
              <CardHeader title="History" subtitle={`${history.length} completed activities`} />
              <div className="scroll-thin max-h-[640px] overflow-y-auto px-5 pb-5">
                {grouped.map((g) => (
                  <div key={g.label} className="mb-6 last:mb-0">
                    <p className="mb-3 text-xs font-semibold tracking-wide text-subtle uppercase">{g.label}</p>
                    <div className="space-y-5">
                      {g.items.map((a) => <div key={a.id} className="relative"><ActivityItem activity={a} /></div>)}
                    </div>
                  </div>
                ))}
                <Pager page={historyPage} total={historyPages} onChange={setHistoryPage} />
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6 xl:col-span-4">
          <Card>
            <CardHeader title="Today's Schedule" subtitle={dayLabel(new Date().toISOString())} action={<Button size="icon-sm" variant="ghost" icon={Plus} aria-label="Schedule" onClick={() => openForm("activity", { defaults: { status: "planned" } })} />} />
            <div className="px-5 pb-5">
              {today.length === 0 ? (
                <EmptyState icon={CalendarClock} title="Nothing scheduled" className="py-6" />
              ) : (
                <div className="space-y-3">
                  {today.map((a) => (
                    <div key={a.id} className="flex items-center gap-3">
                      <span className="w-16 text-xs font-medium text-muted">{formatTime(a.date)}</span>
                      <ActivityIcon type={a.type} className="h-7 w-7" />
                      <div className="min-w-0 flex-1">
                        <p className={a.status === "completed" ? "truncate text-sm text-subtle line-through" : "truncate text-sm font-medium text-fg"}>{a.subject}</p>
                        <p className="truncate text-xs text-muted">{lookup.companies.get(a.companyId ?? "")?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Last 7 Days" subtitle="Completed activities by type" />
            <div className="space-y-3 px-5 pb-5">
              {weekCounts.map((w) => (
                <div key={w.id} className="flex items-center gap-3">
                  <ActivityIcon type={w.id} className="h-7 w-7" />
                  <span className="w-20 text-sm text-fg-2">{w.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div className={`tone-${w.tone} h-full rounded-full`} style={{ width: `${(w.count / weekMax) * 100}%`, background: "currentColor" }} />
                  </div>
                  <span className="w-6 text-right text-sm font-semibold text-fg">{w.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
