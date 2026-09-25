import { OPEN_TICKET_STATUSES, STAGE_MAP } from "./constants";
import { dealStats, isOpen } from "./metrics";
import type { CRMData, User } from "./types";
import { DAY, formatMoney, startOfDay } from "./utils";

const d = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");
const clean = (s: string) => s.replace(/[|\n]+/g, " ").trim();

/** Compact, pipe-separated snapshot of the CRM for the assistant's context. */
export function buildContext(data: CRMData, currency: "INR" | "USD", me: User) {
  const money = (v: number) => formatMoney(v, currency);
  const users = new Map(data.users.map((u) => [u.id, u.name]));
  const companies = new Map(data.companies.map((c) => [c.id, c.name]));
  const contacts = new Map(data.contacts.map((c) => [c.id, `${c.firstName} ${c.lastName}`.trim()]));
  const deals = new Map(data.deals.map((x) => [x.id, x.name]));
  const all = dealStats(data.deals);
  const since = (days: number) => Date.now() - days * DAY;
  const d30 = dealStats(data.deals, since(30));
  const today = startOfDay().getTime();
  const openTasks = data.tasks.filter((t) => t.status === "todo");

  const lines: string[] = [];
  lines.push(`Today: ${new Date().toISOString().slice(0, 10)} · Currency: ${currency} · Signed-in user: ${me.name} (${me.id}, ${me.role})`);
  lines.push("");
  lines.push("## Totals");
  lines.push(`Open pipeline: ${money(all.pipelineValue)} across ${all.openCount} deals · Weighted: ${money(all.weightedValue)}`);
  lines.push(`Won all time: ${money(all.wonValue)} (${all.wonCount} deals) · Lost: ${all.lostCount} · Win rate: ${all.winRate.toFixed(1)}% · Avg deal: ${money(all.avgDealSize)}`);
  lines.push(`Won last 30 days: ${money(d30.wonValue)} (${d30.wonCount} deals)`);
  lines.push(`Contacts: ${data.contacts.length} · Companies: ${data.companies.length} · Open tickets: ${data.tickets.filter((t) => OPEN_TICKET_STATUSES.includes(t.status)).length}`);
  lines.push(`Open tasks: ${openTasks.length} · Overdue: ${openTasks.filter((t) => new Date(t.dueDate).getTime() < today).length}`);

  lines.push("", "## Team (id|name|role)");
  data.users.forEach((u) => lines.push(`${u.id}|${u.name}|${u.role}`));

  lines.push("", "## Companies (id|name|industry|city|country|owner)");
  data.companies.forEach((c) => lines.push([c.id, c.name, c.industry, c.city, c.country, users.get(c.ownerId)].map((x) => clean(x ?? "")).join("|")));

  lines.push("", "## Contacts (id|name|title|company|email|status|owner|created)");
  data.contacts.forEach((c) =>
    lines.push([c.id, contacts.get(c.id), c.title, companies.get(c.companyId ?? ""), c.email, c.status, users.get(c.ownerId), d(c.createdAt)].map((x) => clean(x ?? "")).join("|")),
  );

  lines.push("", "## Deals (id|name|company|contact|amount|stage|expected close|owner|priority|created|closed)");
  data.deals.forEach((x) =>
    lines.push(
      [x.id, x.name, companies.get(x.companyId ?? ""), contacts.get(x.contactId ?? ""), money(x.amount), STAGE_MAP[x.stage].label, d(x.closeDate), users.get(x.ownerId), x.priority, d(x.createdAt), d(x.closedAt)]
        .map((v) => clean(v ?? ""))
        .join("|"),
    ),
  );

  lines.push("", "## Tasks: open, plus completed in the last 30 days (id|title|due|status|priority|assignee|company|deal)");
  data.tasks
    .filter((t) => t.status === "todo" || (t.completedAt && new Date(t.completedAt).getTime() > since(30)))
    .forEach((t) =>
      lines.push([t.id, t.title, d(t.dueDate), t.status === "done" ? "done" : "open", t.priority, users.get(t.assigneeId), companies.get(t.companyId ?? ""), deals.get(t.dealId ?? "")].map((v) => clean(v ?? "")).join("|")),
    );

  lines.push("", "## Tickets (id|number|subject|status|priority|company|contact|assignee|created|resolved)");
  data.tickets.forEach((t) =>
    lines.push([t.id, `#${t.number}`, t.subject, t.status, t.priority, companies.get(t.companyId ?? ""), contacts.get(t.contactId ?? ""), users.get(t.assigneeId), d(t.createdAt), d(t.resolvedAt)].map((v) => clean(v ?? "")).join("|")),
  );

  lines.push("", "## Activities: all planned, plus the 200 most recent completed (date|type|status|subject|company|contact|deal|owner)");
  const planned = data.activities.filter((a) => a.status === "planned");
  const recent = data.activities.filter((a) => a.status === "completed").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 200);
  [...planned, ...recent].forEach((a) =>
    lines.push([d(a.date), a.type, a.status, a.subject, companies.get(a.companyId ?? ""), contacts.get(a.contactId ?? ""), deals.get(a.dealId ?? ""), users.get(a.ownerId)].map((v) => clean(v ?? "")).join("|")),
  );
  return lines.join("\n");
}

/** Rule-based answers used when no Claude API credentials are configured. */
export function localAnswer(question: string, data: CRMData, currency: "INR" | "USD") {
  const q = question.toLowerCase();
  const money = (v: number) => formatMoney(v, currency);
  const today = startOfDay().getTime();
  const users = new Map(data.users.map((u) => [u.id, u.name]));
  const companies = new Map(data.companies.map((c) => [c.id, c.name]));
  const all = dealStats(data.deals);

  const company = data.companies.find((c) => c.name.length > 3 && q.includes(c.name.toLowerCase()));
  if (company) {
    const deals = data.deals.filter((x) => x.companyId === company.id);
    const open = deals.filter(isOpen);
    const won = deals.filter((x) => x.stage === "won");
    const tickets = data.tickets.filter((t) => t.companyId === company.id && OPEN_TICKET_STATUSES.includes(t.status));
    const people = data.contacts.filter((c) => c.companyId === company.id);
    return [
      `### [${company.name}](/companies/${company.id})`,
      `- ${[company.industry, company.city, company.country].filter(Boolean).join(" · ") || "No details"} · owner **${users.get(company.ownerId) ?? "—"}**`,
      `- **${people.length}** contacts, **${open.length}** open deals worth **${money(open.reduce((s, x) => s + x.amount, 0))}**`,
      `- Won so far: **${money(won.reduce((s, x) => s + x.amount, 0))}** from ${won.length} deals`,
      `- Open tickets: **${tickets.length}**`,
      ...open.slice(0, 5).map((x) => `  - [${x.name}](deal:${x.id}) · ${STAGE_MAP[x.stage].label} · ${money(x.amount)}`),
    ].join("\n");
  }

  if (/overdue|due today|my tasks|tasks/.test(q)) {
    const overdue = data.tasks.filter((t) => t.status === "todo" && new Date(t.dueDate).getTime() < today).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const dueToday = data.tasks.filter((t) => t.status === "todo" && startOfDay(t.dueDate).getTime() === today);
    return [
      `**${overdue.length}** overdue tasks and **${dueToday.length}** due today across the team.`,
      ...overdue.slice(0, 8).map((t) => `- ${t.title} · due ${t.dueDate.slice(0, 10)} · ${users.get(t.assigneeId) ?? ""}`),
      overdue.length > 8 ? `- …and ${overdue.length - 8} more on the [Tasks](/tasks) page` : "",
    ].filter(Boolean).join("\n");
  }

  if (/ticket|support|urgent/.test(q)) {
    const open = data.tickets.filter((t) => OPEN_TICKET_STATUSES.includes(t.status));
    const urgent = open.filter((t) => t.priority === "Urgent" || t.priority === "High");
    return [
      `**${open.length}** open tickets, **${urgent.length}** of them High or Urgent.`,
      ...urgent.slice(0, 8).map((t) => `- [#${t.number} ${t.subject}](/tickets/${t.id}) · ${t.priority} · ${companies.get(t.companyId ?? "") ?? "—"} · ${t.status}`),
    ].join("\n");
  }

  if (/biggest|top deal|largest|best deal|close soon|closing/.test(q)) {
    const open = data.deals.filter(isOpen).sort((a, b) => b.amount - a.amount).slice(0, 6);
    return ["Largest open deals:", ...open.map((x) => `- [${x.name}](deal:${x.id}) · **${money(x.amount)}** · ${STAGE_MAP[x.stage].label} · closes ${x.closeDate.slice(0, 10) || "—"}`)].join("\n");
  }

  if (/pipeline|forecast|stage/.test(q)) {
    const byStage = ["new", "contacted", "qualified", "proposal", "negotiation"].map((s) => {
      const ds = data.deals.filter((x) => x.stage === s);
      return `- ${STAGE_MAP[s as keyof typeof STAGE_MAP].label}: ${ds.length} deals · ${money(ds.reduce((a, x) => a + x.amount, 0))}`;
    });
    return [`Open pipeline is **${money(all.pipelineValue)}** across ${all.openCount} deals (weighted **${money(all.weightedValue)}**).`, ...byStage].join("\n");
  }

  if (/revenue|won|win rate|sales|customers/.test(q)) {
    const d30 = dealStats(data.deals, Date.now() - 30 * DAY);
    return [
      `- Won all time: **${money(all.wonValue)}** from ${all.wonCount} deals`,
      `- Won in the last 30 days: **${money(d30.wonValue)}** from ${d30.wonCount} deals`,
      `- Win rate: **${all.winRate.toFixed(1)}%** · Average deal: **${money(all.avgDealSize)}**`,
    ].join("\n");
  }

  return [
    "I'm running in **offline mode**, so I can answer a few common questions:",
    "- \"How is the pipeline?\"",
    "- \"What revenue have we won?\"",
    "- \"Show overdue tasks\"",
    "- \"Any urgent tickets?\"",
    "- \"What are our biggest deals?\"",
    "- Ask about a company by name, e.g. \"Tell me about Brightline Analytics\"",
    "",
    "For full answers, add an Anthropic API key to `.env.local` as `ANTHROPIC_API_KEY` and restart the app.",
  ].join("\n");
}
