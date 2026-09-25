"use client";

import { AlertCircle, ArrowUpRight, Building2, CalendarClock, CheckSquare, Handshake, LifeBuoy, Plus, Trophy, UserPlus, Users, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Ring, Sparkline, TrendChart, useChartTheme } from "@/components/charts";
import { ActivityItem, CompanyLink, OwnerCell, StageBadge, TaskRow, dueState } from "@/components/crm/shared";
import { Avatar, Button, Card, CardHeader, CardLink, CompanyAvatar, EmptyState, IconTile, Progress, Segmented, Select, Trend } from "@/components/ui/primitives";
import type { Tone } from "@/lib/constants";
import { useData, useMoney } from "@/lib/hooks";
import { dashboardKpis, dealStats, monthlyRevenue, ownerPerformance, stageSummary, topCompanies } from "@/lib/metrics";
import type { CRMData } from "@/lib/types";
import { openDeal, openForm } from "@/lib/ui-store";
import { cn, formatDate, formatNumber, isSameDay, relativeTime } from "@/lib/utils";

/** Limits every record to one company ("" = all companies). */
function scopeToCompany(data: CRMData, companyId: string): CRMData {
  if (!companyId) return data;
  const match = <T extends { companyId: string | null }>(xs: T[]) => xs.filter((x) => x.companyId === companyId);
  return {
    ...data,
    companies: data.companies.filter((c) => c.id === companyId),
    contacts: match(data.contacts),
    deals: match(data.deals),
    activities: match(data.activities),
    tasks: match(data.tasks),
    tickets: match(data.tickets),
    events: match(data.events),
  };
}

function StatCard({ label, value, change, series, icon, tone, color, href, invert }: {
  label: string;
  value: string;
  change: number;
  series: number[];
  icon: LucideIcon;
  tone: Tone;
  color: string;
  href: string;
  invert?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <Card className="relative h-full overflow-hidden p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-line-strong group-hover:shadow-pop">
        <div className="flex items-start justify-between">
          <p className="text-[13px] font-medium text-muted">{label}</p>
          <IconTile icon={icon} tone={tone} size="sm" />
        </div>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-fg">{value}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <Trend value={change} invert={invert} />
          <span className="text-xs text-subtle">vs last 30d</span>
        </div>
        <div className="-mx-4 -mb-4 mt-2">
          <Sparkline data={series} color={color} height={40} />
        </div>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const allData = useData();
  const [companyId, setCompanyId] = useState("");
  const data = useMemo(() => scopeToCompany(allData, companyId), [allData, companyId]);
  const scopeName = companyId ? allData.companies.find((c) => c.id === companyId)?.name ?? "" : "";
  const money = useMoney();
  const chart = useChartTheme();
  const [trendMode, setTrendMode] = useState<"revenue" | "won">("revenue");

  const kpi = useMemo(() => dashboardKpis(data), [data]);
  const monthly = useMemo(() => monthlyRevenue(data.deals), [data.deals]);
  const stages = useMemo(() => stageSummary(data.deals).filter((s) => s.id !== "won" && s.id !== "lost"), [data.deals]);
  const stats = useMemo(() => dealStats(data.deals), [data.deals]);
  const leaders = useMemo(() => ownerPerformance(data).slice(0, 5), [data]);
  const yearRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const yearWon = monthly.reduce((s, m) => s + m.won, 0);
  const customers = useMemo(() => topCompanies(data, 5), [data]);

  // Team-wide: the dashboard covers every owner, not just the signed-in user.
  const upcomingTasks = useMemo(
    () =>
      data.tasks
        .filter((t) => t.status === "todo")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 7),
    [data.tasks],
  );
  const overdue = data.tasks.filter((t) => dueState(t) === "overdue").length;
  const dueToday = data.tasks.filter((t) => dueState(t) === "today").length;
  const meetingsToday = data.activities.filter((a) => a.status === "planned" && isSameDay(a.date, new Date())).length;

  const recentActivities = useMemo(
    () => [...data.activities].filter((a) => a.status === "completed").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [data.activities],
  );
  const recentDeals = useMemo(() => [...data.deals].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [data.deals]);
  const openValue = stages.reduce((s, x) => s + x.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted">{formatDate(new Date().toISOString(), { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">
            {scopeName || "Business overview"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {scopeName ? "Everything for this company, across the whole team." : `All ${allData.companies.length} companies · all ${allData.users.length} team members`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[13px]">
            <Link href="/tasks" className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", overdue ? "tone-red" : "tone-gray")}>
              <AlertCircle className="h-3.5 w-3.5" /> {overdue} overdue
            </Link>
            <Link href="/tasks" className="tone-amber inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
              <CheckSquare className="h-3.5 w-3.5" /> {dueToday} due today
            </Link>
            <Link href="/calendar" className="tone-violet inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
              <CalendarClock className="h-3.5 w-3.5" /> {meetingsToday} scheduled today
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="dash-company" className="sr-only">Company</label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
            <Select id="dash-company" value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-56 pl-9">
              <option value="">All companies</option>
              {[...allData.companies].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <Button variant="primary" icon={Plus} onClick={() => openForm("deal", { defaults: companyId ? { companyId } : undefined })}>New deal</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total Contacts" value={formatNumber(kpi.contacts!.value)} change={kpi.contacts!.change} series={kpi.contacts!.series} icon={Users} tone="blue" color={chart.primary} href="/contacts" />
        <StatCard label="New Leads" value={formatNumber(kpi.leads!.value)} change={kpi.leads!.change} series={kpi.leads!.series} icon={UserPlus} tone="cyan" color="#0EA5C6" href="/contacts" />
        <StatCard label="Active Deals" value={formatNumber(kpi.activeDeals!.value)} change={kpi.activeDeals!.change} series={kpi.activeDeals!.series} icon={Handshake} tone="violet" color={chart.violet} href="/deals" />
        <StatCard label="Pipeline Value" value={money.compact(kpi.pipeline!.value)} change={kpi.pipeline!.change} series={kpi.pipeline!.series} icon={Wallet} tone="amber" color="#E08A00" href="/pipeline" />
        <StatCard label="Won Revenue" value={money.compact(kpi.won!.value)} change={kpi.won!.change} series={kpi.won!.series} icon={Trophy} tone="green" color="#16A34A" href="/reports" />
        <StatCard label="Open Tickets" value={formatNumber(kpi.tickets!.value)} change={kpi.tickets!.change} series={kpi.tickets!.series} icon={LifeBuoy} tone="red" color="#E5484D" href="/tickets" invert />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Revenue trend */}
        <Card className="xl:col-span-8">
          <CardHeader
            title="Revenue Trend"
            subtitle="Closed-won revenue over the last 12 months"
            action={<Segmented value={trendMode} onChange={setTrendMode} options={[{ id: "revenue", label: "Value" }, { id: "won", label: "Deals" }]} />}
          />
          <div className="flex flex-wrap gap-x-8 gap-y-2 px-5 pb-2">
            <div>
              <p className="text-xs text-muted">Last 12 months</p>
              <p className="text-xl font-semibold text-fg">{trendMode === "revenue" ? money.compact(yearRevenue) : `${yearWon} deals`}</p>
            </div>
            <div>
              <p className="text-xs text-muted">All-time won</p>
              <p className="text-xl font-semibold text-fg">{trendMode === "revenue" ? money.compact(stats.wonValue) : `${stats.wonCount} deals`}</p>
            </div>
            <div>
              <p className="text-xs text-muted">This month</p>
              <p className="text-xl font-semibold text-fg">{trendMode === "revenue" ? money.compact(monthly.at(-1)!.revenue) : `${monthly.at(-1)!.won} deals`}</p>
            </div>
          </div>
          <div className="relative px-2 pb-4">
            {yearRevenue === 0 && (
              <p className="absolute inset-x-0 top-1/3 z-10 text-center text-sm text-muted">No deals closed-won with a close date in the last 12 months.</p>
            )}
            <TrendChart
              data={monthly}
              xKey="month"
              series={[trendMode === "revenue" ? { key: "revenue", name: "Revenue", color: chart.primary } : { key: "won", name: "Deals won", color: chart.primary }]}
              format={trendMode === "revenue" ? money.full : undefined}
              yFormat={trendMode === "revenue" ? money.compact : undefined}
              height={260}
            />
          </div>
        </Card>

        {/* Upcoming tasks */}
        <Card className="flex flex-col xl:col-span-4">
          <CardHeader title="Upcoming Tasks" subtitle={upcomingTasks.length ? "Next open tasks across the team" : "Nothing pending"} action={<CardLink href="/tasks">View all</CardLink>} />
          <div className="flex-1 divide-y divide-line px-5">
            {upcomingTasks.length ? upcomingTasks.map((t) => <TaskRow key={t.id} task={t} compact />) : (
              <EmptyState icon={CheckSquare} title="All caught up" description="No open tasks." />
            )}
          </div>
          <div className="border-t border-line p-3">
            <Button variant="ghost" size="sm" icon={Plus} className="w-full" onClick={() => openForm("task", { defaults: companyId ? { companyId } : undefined })}>Add task</Button>
          </div>
        </Card>

        {/* Pipeline overview */}
        <Card className="xl:col-span-8">
          <CardHeader title="Sales Pipeline" subtitle={`${stages.reduce((s, x) => s + x.count, 0)} open deals worth ${money.compact(openValue)}`} action={<CardLink href="/pipeline">Open board</CardLink>} />
          <div className="px-5 pb-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-3">
              {stages.map((s) => (
                <div key={s.id} title={`${s.label}: ${money.compact(s.value)}`} style={{ width: `${(s.value / (openValue || 1)) * 100}%`, background: s.color }} className="h-full transition-all first:rounded-l-full last:rounded-r-full" />
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {stages.map((s) => (
                <Link key={s.id} href="/pipeline" className="rounded-xl border border-line p-3 transition-colors hover:border-line-strong hover:bg-surface-2/60">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-xs font-medium text-muted">{s.label}</span>
                  </div>
                  <p className="mt-2 text-xl font-semibold text-fg">{s.count}</p>
                  <p className="text-xs text-muted">{money.compact(s.value)}</p>
                </Link>
              ))}
            </div>
          </div>
        </Card>

        {/* Conversion */}
        <Card className="xl:col-span-4">
          <CardHeader title="Deal Conversion" subtitle="All closed deals" />
          <div className="flex items-center gap-5 px-5 pb-4">
            <Ring value={stats.winRate} size={112} color="var(--green)">
              <span className="text-2xl font-semibold text-fg">{Math.round(stats.winRate)}%</span>
              <span className="text-[11px] text-muted">Win rate</span>
            </Ring>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--green)]" /> <span className="text-muted">Won</span> <span className="font-semibold text-fg">{stats.wonCount}</span></p>
              <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--red)]" /> <span className="text-muted">Lost</span> <span className="font-semibold text-fg">{stats.lostCount}</span></p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-line p-4">
            <div><p className="text-[11px] text-muted">Avg deal</p><p className="text-sm font-semibold text-fg">{money.compact(stats.avgDealSize)}</p></div>
            <div><p className="text-[11px] text-muted">Sales cycle</p><p className="text-sm font-semibold text-fg">{stats.salesCycle ? `${stats.salesCycle} days` : "—"}</p></div>
            <div><p className="text-[11px] text-muted">Weighted</p><p className="text-sm font-semibold text-fg">{money.compact(stats.weightedValue)}</p></div>
          </div>
        </Card>

        {/* Recent deals */}
        <Card className="overflow-hidden xl:col-span-8">
          <CardHeader title="Recent Deals" subtitle="Latest opportunities added to the pipeline" action={<CardLink href="/deals">View all</CardLink>} />
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-line bg-surface-2/60 text-left text-xs font-medium text-muted uppercase">
                  <th className="px-5 py-2.5">Deal</th>
                  <th className="px-3 py-2.5">Stage</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                  <th className="px-3 py-2.5">Owner</th>
                  <th className="px-5 py-2.5 text-right">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentDeals.map((d) => (
                  <tr key={d.id} onClick={() => openDeal(d.id)} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-2/60">
                    <td className="px-5 py-3">
                      <p className="font-medium text-fg">{d.name}</p>
                      <CompanyLink id={d.companyId} className="text-xs text-muted" />
                    </td>
                    <td className="px-3 py-3"><StageBadge stage={d.stage} /></td>
                    <td className="px-3 py-3 text-right font-semibold whitespace-nowrap text-fg">{money.full(d.amount)}</td>
                    <td className="px-3 py-3"><OwnerCell userId={d.ownerId} compact /></td>
                    <td className="px-5 py-3 text-right whitespace-nowrap text-muted">{relativeTime(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent activities */}
        <Card className="xl:col-span-4">
          <CardHeader title="Recent Activities" subtitle="What your team has been up to" action={<CardLink href="/activities">View all</CardLink>} />
          <div className="space-y-5 px-5 pb-5">
            {recentActivities.map((a) => <ActivityItem key={a.id} activity={a} />)}
          </div>
        </Card>

        {/* Sales performance */}
        <Card className="xl:col-span-7">
          <CardHeader title="Sales Performance" subtitle="Top performers · all time" action={<CardLink href="/reports">Reports</CardLink>} />
          <div className="px-5 pb-4">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-line pb-2 text-xs font-medium text-muted uppercase sm:grid-cols-[1fr_60px_110px_140px]">
              <span>Rep</span>
              <span className="text-right">Won</span>
              <span className="text-right">Revenue</span>
              <span className="hidden sm:block">Win rate</span>
            </div>
            {leaders.map((r, i) => (
              <div key={r.user.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-line py-3 last:border-0 sm:grid-cols-[1fr_60px_110px_140px]">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-4 text-xs font-medium text-subtle">{i + 1}</span>
                  <Avatar name={r.user.name} color={r.user.color} size={32} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{r.user.name}</p>
                    <p className="text-xs text-muted">{r.openCount} open · {r.activities} activities</p>
                  </div>
                </div>
                <span className="text-right text-sm font-semibold text-fg">{r.wonCount}</span>
                <span className="text-right text-sm font-semibold text-fg">{money.compact(r.wonValue)}</span>
                <div className="hidden items-center gap-2 sm:flex">
                  <Progress value={r.winRate} color="var(--green)" />
                  <span className="w-9 text-right text-xs text-muted">{Math.round(r.winRate)}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top customers */}
        <Card className="xl:col-span-5">
          <CardHeader title="Top Customers" subtitle="By lifetime won revenue" action={<CardLink href="/companies">View all</CardLink>} />
          <div className="px-5 pb-4">
            {customers.length === 0 && <EmptyState icon={Building2} title="No won revenue linked to a company yet" description="Won deals appear here once they are associated with a company." className="py-8" />}
            {customers.map((c, i) => (
              <Link key={c.company.id} href={`/companies/${c.company.id}`} className="group flex items-center gap-3 border-b border-line py-3 last:border-0">
                <CompanyAvatar name={c.company.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg group-hover:text-primary">{c.company.name}</p>
                  <Progress value={(c.revenue / customers[0]!.revenue) * 100} className="mt-1.5 h-1" color={i === 0 ? chart.primary : undefined} />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-fg">{money.compact(c.revenue)}</p>
                  <p className="text-xs text-muted">{c.deals} deals</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
