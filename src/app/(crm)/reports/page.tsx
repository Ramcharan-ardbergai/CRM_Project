"use client";

import { Clock, Download, Handshake, Percent, Target, Trophy, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Bars, Donut, TrendChart, useChartTheme } from "@/components/charts";
import { Avatar, Button, Card, CardHeader, IconTile, PageHeader, Progress, Segmented } from "@/components/ui/primitives";
import { ACTIVITY_TYPES, LEAD_SOURCES, STAGES } from "@/lib/constants";
import { useData, useMoney } from "@/lib/hooks";
import { customerGrowth, dealStats, leadSources, monthlyRevenue, ownerPerformance, stageSummary } from "@/lib/metrics";
import { useMeId } from "@/lib/store";
import type { CRMData } from "@/lib/types";
import { toast } from "@/lib/ui-store";
import { DAY, downloadCSV, pctChange } from "@/lib/utils";
import { Trend } from "@/components/ui/primitives";

type Range = "all" | "30" | "90" | "365";
const TYPE_COLORS: Record<string, string> = { call: "#16A34A", email: "#4054E8", meeting: "#7C5CF0", note: "#E08A00", "follow-up": "#0EA5C6" };

/** Reports are account-scoped: include every record belonging to companies owned by the signed-in user. */
function scopeToLoggedInUser(data: CRMData, userId: string): CRMData {
  const companyIds = new Set(data.companies.filter((c) => c.ownerId === userId).map((c) => c.id));
  const match = <T extends { companyId: string | null }>(rows: T[]) => rows.filter((row) => row.companyId !== null && companyIds.has(row.companyId));
  return {
    ...data,
    companies: data.companies.filter((c) => companyIds.has(c.id)),
    contacts: match(data.contacts),
    deals: match(data.deals),
    activities: match(data.activities),
    tasks: match(data.tasks),
    tickets: match(data.tickets),
    events: match(data.events),
  };
}

export default function ReportsPage() {
  const data = useData();
  const meId = useMeId();
  const scopedData = useMemo(() => scopeToLoggedInUser(data, meId), [data, meId]);
  const me = data.users.find((u) => u.id === meId);
  const money = useMoney();
  const chart = useChartTheme();
  const [range, setRange] = useState<Range>("all");
  const days = range === "all" ? 0 : Number(range);
  const from = days ? Date.now() - days * DAY : 0;

  const stats = useMemo(() => dealStats(scopedData.deals, from), [scopedData.deals, from]);
  // Previous equal-length window for comparison.
  const prev = useMemo(() => {
    if (!days) return null;
    const prevFrom = from - days * DAY;
    return dealStats(scopedData.deals.filter((d) => new Date(d.createdAt).getTime() < from && (!d.closedAt || new Date(d.closedAt).getTime() < from)), prevFrom);
  }, [scopedData.deals, from, days]);
  const monthly = useMemo(() => monthlyRevenue(scopedData.deals, 12), [scopedData.deals]);
  const stages = useMemo(() => stageSummary(scopedData.deals), [scopedData.deals]);
  const owners = useMemo(() => ownerPerformance(scopedData, from), [scopedData, from]);
  const growth = useMemo(() => customerGrowth(scopedData), [scopedData]);
  const sources = useMemo(() => leadSources(scopedData), [scopedData]);

  const activityByOwner = useMemo(
    () =>
      scopedData.users
        .map((u) => {
          const row: Record<string, string | number> = { name: u.name.split(" ")[0]! };
          ACTIVITY_TYPES.forEach((t) => {
            row[t.id] = scopedData.activities.filter((a) => a.ownerId === u.id && a.type === t.id && a.status === "completed" && (!from || new Date(a.date).getTime() >= from)).length;
          });
          return row;
        })
        .filter((r) => ACTIVITY_TYPES.some((t) => (r[t.id] as number) > 0)),
    [scopedData, from],
  );

  const sourceConversion = LEAD_SOURCES.map((s) => {
    const all = scopedData.contacts.filter((c) => c.source === s);
    const customers = all.filter((c) => c.status === "Customer").length;
    return { source: s, total: all.length, customers, rate: all.length ? (customers / all.length) * 100 : 0 };
  }).sort((a, b) => b.rate - a.rate);

  const kpis = [
    { label: "Won revenue", value: money.compact(stats.wonValue), change: prev ? pctChange(stats.wonValue, prev.wonValue) : null, icon: Wallet, tone: "green" as const },
    { label: "Deals won", value: String(stats.wonCount), change: prev ? pctChange(stats.wonCount, prev.wonCount) : null, icon: Trophy, tone: "blue" as const },
    { label: "Win rate", value: `${Math.round(stats.winRate)}%`, change: prev ? stats.winRate - prev.winRate : null, icon: Target, tone: "violet" as const },
    { label: "Avg deal size", value: money.compact(stats.avgDealSize), change: prev ? pctChange(stats.avgDealSize, prev.avgDealSize) : null, icon: Handshake, tone: "amber" as const },
    { label: "Conversion rate", value: `${stats.conversionRate.toFixed(1)}%`, change: prev ? stats.conversionRate - prev.conversionRate : null, icon: Percent, tone: "cyan" as const },
    { label: "Avg sales cycle", value: stats.salesCycle ? `${stats.salesCycle} days` : "—", change: prev ? pctChange(stats.salesCycle, prev.salesCycle) : null, icon: Clock, tone: "gray" as const, invert: true },
  ];

  const exportReport = () => {
    downloadCSV(`sales-report-${range === "all" ? "all-time" : `${days}d`}.csv`, [
      ["Metric", "Value"],
      ...kpis.map((k) => [k.label, k.value]),
      [],
      ["Rep", "Won deals", "Won revenue", "Win rate %", "Open deals", "Activities"],
      ...owners.map((o) => [o.user.name, o.wonCount, o.wonValue, Math.round(o.winRate), o.openCount, o.activities]),
      [],
      ["Month", "Revenue", "Deals won", "Deals created"],
      ...monthly.map((m) => [m.label, m.revenue, m.won, m.created]),
    ]);
    toast.success("Report exported");
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description={me ? `Showing complete data for ${scopedData.companies.length} ${scopedData.companies.length === 1 ? "company" : "companies"} owned by ${me.name}.` : "Understand revenue, pipeline health and team performance."}
        actions={
          <>
            <Segmented value={range} onChange={setRange} options={[{ id: "all", label: "All time" }, { id: "30", label: "30 days" }, { id: "90", label: "90 days" }, { id: "365", label: "12 months" }]} />
            <Button icon={Download} onClick={exportReport}>Export</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-muted">{k.label}</p>
              <IconTile icon={k.icon} tone={k.tone} size="sm" />
            </div>
            <p className="mt-1 text-xl font-semibold tracking-tight text-fg">{k.value}</p>
            {k.change !== null ? (
              <div className="mt-1 flex items-center gap-1">
                <Trend value={k.change} invert={k.invert} />
                <span className="text-[11px] text-subtle">vs prior period</span>
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-subtle">All time</p>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader title="Revenue by Month" subtitle="Closed-won revenue, last 12 months" />
          <div className="relative px-2 pb-4">
            {monthly.every((m) => m.revenue === 0) && (
              <p className="absolute inset-x-0 top-1/3 z-10 text-center text-sm text-muted">No deals closed-won with a close date in the last 12 months.</p>
            )}
            <Bars data={monthly} xKey="month" series={[{ key: "revenue", name: "Revenue", color: chart.primary }]} format={money.full} yFormat={money.compact} height={280} />
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader title="Deals by Stage" subtitle="Deals for your companies" />
          <div className="px-5 pb-5">
            <Donut data={stages.map((s) => ({ name: s.label, value: s.count, color: s.color }))} center={{ value: String(scopedData.deals.length), label: "Deals" }} height={180} />
            <div className="mt-4 space-y-2">
              {stages.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="flex-1 text-fg-2">{s.label}</span>
                  <span className="text-xs text-muted">{money.compact(s.value)}</span>
                  <span className="w-8 text-right font-semibold text-fg">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-6">
          <CardHeader title="Sales by Owner" subtitle={range === "all" ? "Won revenue, all time" : "Won revenue in the selected period"} />
          <div className="px-5 pb-4">
            {owners.length === 0 && <p className="py-10 text-center text-sm text-muted">No closed deals in this period.</p>}
            {owners.map((o) => (
              <div key={o.user.id} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                <Avatar name={o.user.name} color={o.user.color} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-fg">{o.user.name}</p>
                    <p className="text-sm font-semibold text-fg">{money.compact(o.wonValue)}</p>
                  </div>
                  <Progress className="mt-1.5" value={(o.wonValue / (owners[0]!.wonValue || 1)) * 100} color={o.user.color} />
                  <p className="mt-1 text-xs text-muted">{o.wonCount} won · {Math.round(o.winRate)}% win rate · {o.openCount} open</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-6">
          <CardHeader title="Activity Performance" subtitle="Completed activities by rep and type" />
          <div className="px-2 pb-2">
            <Bars data={activityByOwner} xKey="name" stacked series={ACTIVITY_TYPES.map((t) => ({ key: t.id, name: t.label, color: TYPE_COLORS[t.id]! }))} height={260} />
          </div>
          <div className="flex flex-wrap gap-3 px-5 pb-5">
            {ACTIVITY_TYPES.map((t) => (
              <span key={t.id} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-2 w-2 rounded-sm" style={{ background: TYPE_COLORS[t.id] }} />{t.label}
              </span>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-7">
          <CardHeader title="Customer Growth" subtitle="Total contacts in your CRM over time" />
          <div className="px-2 pb-4">
            <TrendChart data={growth} xKey="month" series={[{ key: "total", name: "Contacts", color: chart.violet }]} height={240} />
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader title="Lead Sources" subtitle="Where contacts come from and how they convert" />
          <div className="px-5 pb-5">
            <div className="grid grid-cols-[1fr_60px_90px] gap-2 border-b border-line pb-2 text-xs font-medium text-muted uppercase">
              <span>Source</span><span className="text-right">Contacts</span><span className="text-right">Conversion</span>
            </div>
            {sourceConversion.map((s) => (
              <div key={s.source} className="grid grid-cols-[1fr_60px_90px] items-center gap-2 border-b border-line py-2.5 text-sm last:border-0">
                <div>
                  <p className="text-fg-2">{s.source}</p>
                  <Progress className="mt-1 h-1" value={(s.total / Math.max(1, ...sources.map((x) => x.count))) * 100} color={chart.primary} />
                </div>
                <span className="text-right font-semibold text-fg">{s.total}</span>
                <span className="text-right text-fg-2">{Math.round(s.rate)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <p className="mt-6 text-xs text-subtle">
        Win rate = won ÷ (won + lost) for deals closed in the period. Conversion rate = share of deals created in the period that are already won.
        Stage probabilities: {STAGES.filter((s) => s.id !== "won" && s.id !== "lost").map((s) => `${s.label} ${s.probability}%`).join(" · ")}.
      </p>
    </>
  );
}
