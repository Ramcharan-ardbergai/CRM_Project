import { ACTIVITY_TYPES, LEAD_SOURCES, OPEN_STAGES, OPEN_TICKET_STATUSES, STAGES } from "./constants";
import type { CRMData, Deal, ID } from "./types";
import { DAY, pctChange } from "./utils";

const t = (iso: string) => new Date(iso).getTime();

export const isOpen = (d: Deal) => OPEN_STAGES.includes(d.stage);

/** Deals that were open at a given moment in time. */
const openAt = (deals: Deal[], at: number) =>
  deals.filter((d) => t(d.createdAt) <= at && (d.closedAt === null || t(d.closedAt) > at));

const inRange = (iso: string | null, from: number, to: number) => !!iso && t(iso) > from && t(iso) <= to;

/** Weekly buckets (oldest → newest) for sparklines. */
function weekly(values: (string | null)[], weeks = 10, weights?: number[]) {
  const now = Date.now();
  const out = Array.from({ length: weeks }, () => 0);
  values.forEach((iso, i) => {
    if (!iso) return;
    const w = Math.floor((now - t(iso)) / (7 * DAY));
    if (w >= 0 && w < weeks) out[weeks - 1 - w]! += weights ? weights[i]! : 1;
  });
  return out;
}

export interface Kpi {
  value: number;
  change: number;
  series: number[];
}

export function dashboardKpis(data: CRMData, days = 30): Record<string, Kpi> {
  const now = Date.now();
  const cut = now - days * DAY;
  const prevCut = now - 2 * days * DAY;
  const { contacts, deals, tickets } = data;

  const contactsNow = contacts.length;
  const contactsBefore = contacts.filter((c) => t(c.createdAt) <= cut).length;

  const leads = contacts.filter((c) => c.status === "Lead");
  const newLeads = leads.filter((c) => inRange(c.createdAt, cut, now)).length;
  const prevLeads = leads.filter((c) => inRange(c.createdAt, prevCut, cut)).length;

  const open = deals.filter(isOpen);
  const openBefore = openAt(deals, cut);
  const sum = (ds: Deal[]) => ds.reduce((s, d) => s + d.amount, 0);

  const won = deals.filter((d) => d.stage === "won");
  const wonNow = sum(won.filter((d) => inRange(d.closedAt, cut, now)));
  const wonPrev = sum(won.filter((d) => inRange(d.closedAt, prevCut, cut)));

  const openTickets = tickets.filter((x) => OPEN_TICKET_STATUSES.includes(x.status)).length;
  const openTicketsBefore = tickets.filter(
    (x) => t(x.createdAt) <= cut && (!x.resolvedAt || t(x.resolvedAt) > cut),
  ).length;

  return {
    contacts: { value: contactsNow, change: pctChange(contactsNow, contactsBefore), series: cumulative(weekly(contacts.map((c) => c.createdAt))) },
    leads: { value: newLeads, change: pctChange(newLeads, prevLeads), series: weekly(leads.map((c) => c.createdAt)) },
    activeDeals: { value: open.length, change: pctChange(open.length, openBefore.length), series: weekly(deals.map((d) => d.createdAt)) },
    pipeline: { value: sum(open), change: pctChange(sum(open), sum(openBefore)), series: cumulative(weekly(open.map((d) => d.createdAt), 10, open.map((d) => d.amount))) },
    won: { value: wonNow, change: pctChange(wonNow, wonPrev), series: weekly(won.map((d) => d.closedAt), 10, won.map((d) => d.amount)) },
    tickets: { value: openTickets, change: pctChange(openTickets, openTicketsBefore), series: weekly(tickets.map((x) => x.createdAt)) },
  };
}

function cumulative(values: number[]) {
  let acc = 0;
  return values.map((v) => (acc += v));
}

export function monthlyRevenue(deals: Deal[], months = 12) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const won = deals.filter((x) => x.stage === "won" && x.closedAt && t(x.closedAt) >= d.getTime() && t(x.closedAt) < next.getTime());
    const created = deals.filter((x) => t(x.createdAt) >= d.getTime() && t(x.createdAt) < next.getTime());
    return {
      month: d.toLocaleDateString("en-IN", { month: "short" }),
      label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      revenue: won.reduce((s, x) => s + x.amount, 0),
      won: won.length,
      created: created.length,
    };
  });
}

export function stageSummary(deals: Deal[]) {
  return STAGES.map((s) => {
    const ds = deals.filter((d) => d.stage === s.id);
    return { ...s, count: ds.length, value: ds.reduce((a, d) => a + d.amount, 0) };
  });
}

export function dealStats(deals: Deal[], from = 0) {
  // from = 0 means all time, which also counts closed deals that have no close date.
  const closed = deals.filter((d) => (d.stage === "won" || d.stage === "lost") && (from === 0 || (d.closedAt && t(d.closedAt) >= from)));
  const won = closed.filter((d) => d.stage === "won");
  const lost = closed.filter((d) => d.stage === "lost");
  const open = deals.filter(isOpen);
  const wonValue = won.reduce((s, d) => s + d.amount, 0);
  const timed = won.filter((d) => d.closedAt);
  const cycle = timed.length ? timed.reduce((s, d) => s + Math.max(0, t(d.closedAt!) - t(d.createdAt)) / DAY, 0) / timed.length : 0;
  const created = deals.filter((d) => t(d.createdAt) >= from);
  return {
    openCount: open.length,
    pipelineValue: open.reduce((s, d) => s + d.amount, 0),
    weightedValue: open.reduce((s, d) => s + (d.amount * d.probability) / 100, 0),
    wonCount: won.length,
    lostCount: lost.length,
    wonValue,
    winRate: won.length + lost.length ? (won.length / (won.length + lost.length)) * 100 : 0,
    avgDealSize: won.length ? wonValue / won.length : 0,
    salesCycle: Math.round(cycle),
    // Share of deals created in the period that have already been won.
    conversionRate: created.length ? (created.filter((d) => d.stage === "won").length / created.length) * 100 : 0,
  };
}

export function ownerPerformance(data: CRMData, from = 0) {
  return data.users
    .map((u) => {
      const mine = data.deals.filter((d) => d.ownerId === u.id);
      const s = dealStats(mine, from);
      return { user: u, ...s, activities: data.activities.filter((a) => a.ownerId === u.id && (from === 0 || t(a.date) >= from) && a.status === "completed").length };
    })
    .filter((r) => r.wonCount + r.lostCount + r.openCount > 0)
    .sort((a, b) => b.wonValue - a.wonValue);
}

export function topCompanies(data: CRMData, limit = 5) {
  return data.companies
    .map((c) => {
      const won = data.deals.filter((d) => d.companyId === c.id && d.stage === "won");
      return { company: c, revenue: won.reduce((s, d) => s + d.amount, 0), deals: won.length };
    })
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function leadSources(data: CRMData) {
  return LEAD_SOURCES.map((s) => ({ source: s, count: data.contacts.filter((c) => c.source === s).length })).sort((a, b) => b.count - a.count);
}

export function customerGrowth(data: CRMData, months = 12) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const end = new Date(now.getFullYear(), now.getMonth() - (months - 2 - i), 1).getTime();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return {
      month: start.toLocaleDateString("en-IN", { month: "short" }),
      total: data.contacts.filter((c) => t(c.createdAt) < end).length,
      added: data.contacts.filter((c) => t(c.createdAt) >= start.getTime() && t(c.createdAt) < end).length,
    };
  });
}

export function activityBreakdown(data: CRMData, from: number) {
  return ACTIVITY_TYPES.map((a) => ({
    ...a,
    completed: data.activities.filter((x) => x.type === a.id && x.status === "completed" && t(x.date) >= from).length,
    planned: data.activities.filter((x) => x.type === a.id && x.status === "planned").length,
  }));
}

/** Most recent activity date per contact. */
export function lastActivityByContact(data: CRMData) {
  const map = new Map<ID, string>();
  data.activities.forEach((a) => {
    if (!a.contactId || a.status !== "completed") return;
    const prev = map.get(a.contactId);
    if (!prev || prev < a.date) map.set(a.contactId, a.date);
  });
  return map;
}
