import { LEAD_SOURCES, STAGE_MAP } from "../constants";
import type {
  Activity,
  Company,
  Contact,
  ContactStatus,
  CRMData,
  Deal,
  DealStage,
  LeadSource,
  Priority,
  Role,
  Task,
  Ticket,
  TicketPriority,
  TicketStatus,
  TimelineEvent,
  User,
} from "../types";
import { parseAmount, parseDate } from "./csv";

export interface ImportFileReport {
  file: string;
  rows: number;
  created: Record<string, number>;
  notes: string[];
}

export interface ImportResult {
  data: CRMData;
  report: ImportFileReport[];
  importedAt: string;
}

type Row = Record<string, string>;

const USER_COLORS = ["#4054E8", "#7C5CF0", "#0EA5C6", "#E08A00", "#16A34A", "#E5484D", "#C2410C"];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const splitList = (s: string) => s.split(";").map((x) => x.trim()).filter(Boolean);

/** First non-empty value among the given column names. */
const get = (row: Row, ...keys: string[]) => {
  for (const k of keys) if (row[k]) return row[k]!;
  return "";
};

/** HubSpot default pipeline stages → Focus CRM stages. */
function mapStage(value: string): DealStage {
  const v = value.toLowerCase();
  if (!v) return "new";
  if (v.includes("closed won")) return "won";
  if (v.includes("closed lost")) return "lost";
  if (v.includes("contract") || v.includes("decision maker") || v.includes("negotiat")) return "negotiation";
  if (v.includes("proposal") || v.includes("presentation")) return "proposal";
  if (v.includes("qualified")) return "qualified";
  if (v.includes("appointment") || v.includes("contacted")) return "contacted";
  return "new";
}

function mapTicketStatus(value: string): TicketStatus {
  const v = value.toLowerCase();
  if (v.includes("waiting on us") || v.includes("progress")) return "In Progress";
  if (v.includes("waiting")) return "Waiting";
  if (v.includes("closed")) return "Closed";
  if (v.includes("resolved")) return "Resolved";
  return "Open";
}

function mapLifecycle(value: string): ContactStatus | null {
  const v = value.toLowerCase();
  if (!v) return null;
  if (v.includes("customer") || v.includes("evangelist")) return "Customer";
  if (v.includes("opportunity") || v.includes("sql") || v.includes("mql") || v.includes("sales qualified") || v.includes("marketing qualified")) return "Prospect";
  if (v.includes("other")) return "Inactive";
  return "Lead";
}

const mapPriority = (v: string): Priority => (/high|urgent/i.test(v) ? "High" : /low/i.test(v) ? "Low" : "Medium");
const mapTicketPriority = (v: string): TicketPriority =>
  /urgent/i.test(v) ? "Urgent" : /high/i.test(v) ? "High" : /low/i.test(v) ? "Low" : "Medium";

const titleCase = (s: string) =>
  s
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join(" ");

/**
 * Builds the CRM dataset from HubSpot-style CSV exports.
 * Columns are detected from each file's header, so one row can create and link
 * several records (e.g. company + deal + note). Records are merged across files by
 * company domain/name, contact email/name, and deal/ticket name.
 */
export function importHubSpot(files: { name: string; text: string; rows: Row[] }[]): ImportResult {
  const now = new Date().toISOString();
  let seq = 0;
  const id = (p: string) => `${p}${++seq}`;

  const users = new Map<string, User & { refs: number; explicitRole?: boolean }>();
  const companies: (Company & { extra: Record<string, string> })[] = [];
  const contacts: (Contact & { extra: Record<string, string>; lifecycle: ContactStatus | null })[] = [];
  const deals: (Deal & { extra: Record<string, string> })[] = [];
  const tickets: (Ticket & { extra: Record<string, string> })[] = [];
  const activities: Activity[] = [];
  const tasks: Task[] = [];
  const sourceFile = new Map<string, string>();
  const report: ImportFileReport[] = [];

  const byDomain = new Map<string, Company>();
  const byCompanyName = new Map<string, Company>();
  const byEmail = new Map<string, Contact>();
  const byContactName = new Map<string, Contact>();
  const byDealName = new Map<string, Deal>();
  const byTicketName = new Map<string, Ticket>();
  const byDealId = new Map<string, Deal>();
  const byTicketId = new Map<string, Ticket>();
  const seenActivity = new Set<string>();
  const seenTask = new Set<string>();

  const setExtra = (extra: Record<string, string>, key: string, value: string) => {
    if (!value) return;
    if (!extra[key]) extra[key] = value;
    else if (!extra[key]!.split("; ").includes(value)) extra[key] += `; ${value}`;
  };

  /** Owner placeholder: email or "" (resolved to the default owner at the end). */
  const owner = (value: string) => {
    const email = value.trim().toLowerCase();
    if (!isEmail(email)) return "";
    let u = users.get(email);
    if (!u) {
      u = { id: `u${users.size + 1}`, name: titleCase(email.split("@")[0]!), email, role: "Account Executive", color: USER_COLORS[users.size % USER_COLORS.length]!, refs: 0 };
      users.set(email, u);
    }
    u.refs++;
    return u.id;
  };

  for (const file of files) {
    const rep: ImportFileReport = { file: file.name, rows: file.rows.length, created: {}, notes: [] };
    const bump = (k: string) => (rep.created[k] = (rep.created[k] ?? 0) + 1);
    const cols = new Set(Object.keys(file.rows[0] ?? {}));
    const has = (...k: string[]) => k.some((x) => cols.has(x));

    const isProduct = has("product price");
    const isLineItem = has("quantity");
    const hasContactCols = has("first name", "last name", "email", "email address");
    const companyNameCol = has("company name") ? "company name" : has("name") && has("company domain name") ? "name" : "";

    // "Create date" belongs to the file's main object.
    const primary = has("ticket name")
      ? "ticket"
      : has("deal name") && has("deal stage")
        ? "deal"
        : hasContactCols && !has("call title", "meeting name", "email subject", "note body", "task title")
          ? "contact"
          : companyNameCol
            ? "company"
            : "";

    // Team file: names and roles for owner emails.
    if (has("user email")) {
      for (const row of file.rows) {
        const userId = owner(row["user email"] ?? "");
        const u = [...users.values()].find((x) => x.id === userId);
        if (!u) continue;
        u.refs--; // registering a user isn't an assignment
        const name = [row["user first name"], row["user last name"]].filter(Boolean).join(" ");
        if (name) u.name = name;
        const role = row["user role"] as Role | undefined;
        if (role && ["Admin", "Sales Manager", "Account Executive", "Support Agent"].includes(role)) {
          u.role = role;
          u.explicitRole = true;
        }
        bump("users");
      }
      report.push(rep);
      continue;
    }

    if (isProduct) {
      rep.notes.push("Product catalogue — not imported (no Products module in this CRM).");
      report.push(rep);
      continue;
    }

    for (const row of file.rows) {
      /* ---------- Line items: add to the matching deal's amount ---------- */
      if (isLineItem) {
        const deal = byDealName.get(norm(get(row, "deal name")));
        const qty = parseAmount(row["quantity"]) || 1;
        const price = parseAmount(get(row, "price", "unit price"));
        if (deal && price) {
          deal.amount += qty * price;
          setExtra((deal as Deal & { extra: Record<string, string> }).extra, "Line items", `${get(row, "name", "new line item name")} × ${qty}`);
          if (row["currency code"]) setExtra((deal as Deal & { extra: Record<string, string> }).extra, "Currency", row["currency code"]!);
          bump("line items");
        } else {
          rep.notes.push(`Line item "${get(row, "name", "new line item name") || get(row, "product id (existing)")}" skipped — deal ${get(row, "deal name", "deal unique value (recordid)")} not found in the CSV files.`);
        }
        continue;
      }

      /* ---------- Company ---------- */
      let company: (typeof companies)[number] | undefined;
      const companyName = companyNameCol ? row[companyNameCol] ?? "" : "";
      const domain = (row["company domain name"] ?? "").toLowerCase();
      if (companyName || domain) {
        company = (byDomain.get(domain) ?? byCompanyName.get(norm(companyName))) as typeof company;
        if (!company) {
          company = {
            id: id("co"),
            name: companyName || domain,
            industry: "",
            website: domain,
            phone: "",
            city: "",
            country: "",
            employees: "",
            ownerId: "",
            createdAt: now,
            extra: {},
          };
          companies.push(company);
          sourceFile.set(company.id, file.name);
          bump("companies");
        }
        if (domain) byDomain.set(domain, company);
        if (companyName) byCompanyName.set(norm(companyName), company);
        company.website ||= domain;
        company.city ||= row["city"] ?? "";
        company.industry ||= row["industry"] ?? "";
        company.employees ||= row["number of employees"] ?? "";
        company.country ||= get(row, "country/region", "country");
        if (row["company owner"]) company.ownerId ||= owner(row["company owner"]!);
        if (primary === "company") company.createdAt = parseDate(row["create date"]) ?? company.createdAt;
        if (!hasContactCols) company.phone ||= row["phone number"] ?? "";
        if (companyName && norm(companyName) !== norm(company.name)) setExtra(company.extra, "Also known as", companyName);
        splitList(row["associated company domain name"] ?? "").forEach((d) => setExtra(company!.extra, "Associated companies", d));
      }

      /* ---------- Contact ---------- */
      let contact: (typeof contacts)[number] | undefined;
      const first = get(row, "first name");
      const last = get(row, "last name");
      const email = get(row, "email address", "email").toLowerCase();
      if (hasContactCols && (first || last || email)) {
        const nameKey = norm(first + last);
        contact = (byEmail.get(email) ?? (nameKey ? byContactName.get(nameKey) : undefined)) as typeof contact;
        if (!contact) {
          contact = {
            id: id("c"),
            firstName: first,
            lastName: last,
            email,
            phone: "",
            title: "",
            companyId: null,
            status: "Lead",
            source: "Import",
            ownerId: "",
            createdAt: now,
            extra: {},
            lifecycle: null,
          };
          contacts.push(contact);
          sourceFile.set(contact.id, file.name);
          bump("contacts");
        } else if (email && contact.email && email !== contact.email) {
          setExtra(contact.extra, "Other emails", email);
        }
        if (email) byEmail.set(email, contact);
        if (nameKey) byContactName.set(nameKey, contact);
        contact.firstName ||= first;
        contact.lastName ||= last;
        contact.email ||= email;
        contact.phone ||= get(row, "mobile phone number", "phone number");
        contact.lifecycle ??= mapLifecycle(row["lifecycle stage"] ?? "");
        contact.title ||= row["job title"] ?? "";
        const src = LEAD_SOURCES.find((x) => x.toLowerCase() === (row["original source"] ?? "").toLowerCase());
        if (src && contact.source === "Import") contact.source = src as LeadSource;
        if (row["contact owner"]) contact.ownerId ||= owner(row["contact owner"]!);
        if (primary === "contact") contact.createdAt = parseDate(row["create date"]) ?? contact.createdAt;
        if (company) contact.companyId ??= company.id;
        const label = row["association label"] ?? "";
        if (label) {
          if (!contact.title) contact.title = label;
          if (company) setExtra(contact.extra, "Company roles", `${company.name}: ${label}`);
        }
        if (row["favorite food"]) setExtra(contact.extra, "Favorite food", row["favorite food"]!);
        const related = splitList(row["associated contact email"] ?? "");
        related.forEach((e) => setExtra(contact!.extra, "Related contacts", `${row["label"] ? row["label"] + ": " : ""}${e}`));
      }

      /* ---------- Deal ---------- */
      let deal: (typeof deals)[number] | undefined;
      const dealName = get(row, "deal name");
      if (dealName) {
        const dealId = row["deal id"] ?? "";
        deal = ((dealId && byDealId.get(dealId)) || byDealName.get(norm(dealName))) as typeof deal;
        const stageRaw = get(row, "deal stage");
        if (!deal) {
          const stage = mapStage(stageRaw);
          deal = {
            id: id("d"),
            name: dealName,
            companyId: null,
            contactId: null,
            amount: 0,
            stage,
            probability: STAGE_MAP[stage].probability,
            closeDate: "",
            ownerId: "",
            priority: "Medium",
            createdAt: now,
            closedAt: null,
            extra: {},
          };
          deals.push(deal);
          byDealName.set(norm(dealName), deal);
          if (dealId) byDealId.set(dealId, deal);
          sourceFile.set(deal.id, file.name);
          bump("deals");
        }
        if (stageRaw) setExtra(deal.extra, "HubSpot stage", stageRaw);
        setExtra(deal.extra, "Pipeline", get(row, "pipeline", "deal pipeline"));
        setExtra(deal.extra, "Product of interest", row["product of interest"] ?? "");
        setExtra(deal.extra, "HubSpot deal ID", row["deal id"] ?? "");
        setExtra(deal.extra, "Currency", row["deal currency"] ?? (/\$/.test(row["amount"] ?? "") ? "USD" : ""));
        if (!deal.amount) deal.amount = parseAmount(row["amount"]);
        if (row["deal owner"]) deal.ownerId ||= owner(row["deal owner"]!);
        if (row["deal priority"]) deal.priority = mapPriority(row["deal priority"]!);
        if (primary === "deal") deal.createdAt = parseDate(row["create date"]) ?? deal.createdAt;
        const close = parseDate(row["close date"]);
        if (close && !deal.closeDate) deal.closeDate = close;
        if (company) {
          if (!deal.companyId) deal.companyId = company.id;
          else if (deal.companyId !== company.id) setExtra(deal.extra, "Other companies", company.name);
          if (row["association label"]) setExtra(deal.extra, "Company roles", `${company.name}: ${row["association label"]}`);
        }
        const poc = row["point of contact"];
        if (poc) {
          let c = byContactName.get(norm(poc)) as (typeof contacts)[number] | undefined;
          if (!c) {
            const [f, ...rest] = poc.split(" ");
            c = { id: id("c"), firstName: f ?? poc, lastName: rest.join(" "), email: "", phone: "", title: "", companyId: null, status: "Lead", source: "Import", ownerId: "", createdAt: now, extra: {}, lifecycle: null };
            contacts.push(c);
            byContactName.set(norm(poc), c);
            sourceFile.set(c.id, file.name);
            bump("contacts");
          }
          deal.contactId ??= c.id;
        }
        if (contact) deal.contactId ??= contact.id;
        splitList(row["associated deal record id"] ?? "").length &&
          setExtra(deal.extra, "Associated HubSpot deal IDs", splitList(row["associated deal record id"]!).join(", "));
      }

      /* ---------- Ticket ---------- */
      let ticket: (typeof tickets)[number] | undefined;
      const ticketName = get(row, "ticket name");
      if (ticketName) {
        const ticketKey = row["ticket id"] ? `id:${row["ticket id"]}` : norm(ticketName);
        ticket = (byTicketId.get(ticketKey) ?? byTicketName.get(ticketKey)) as typeof ticket;
        if (!ticket) {
          const created = parseDate(row["create date"]) ?? now;
          const closed = parseDate(row["close date"]);
          const status = mapTicketStatus(row["ticket status"] ?? "");
          ticket = {
            id: id("tk"),
            number: 1001 + tickets.length,
            subject: ticketName,
            description: "",
            contactId: null,
            companyId: null,
            priority: mapTicketPriority(row["priority"] ?? ""),
            status,
            assigneeId: owner(row["ticket owner"] ?? ""),
            createdAt: created,
            updatedAt: closed ?? created,
            resolvedAt: status === "Closed" || status === "Resolved" ? (closed ?? now) : null,
            extra: {},
          };
          tickets.push(ticket);
          if (row["ticket id"]) byTicketId.set(ticketKey, ticket);
          else byTicketName.set(ticketKey, ticket);
          sourceFile.set(ticket.id, file.name);
          bump("tickets");
        }
        setExtra(ticket.extra, "HubSpot status", row["ticket status"] ?? "");
        setExtra(ticket.extra, "Pipeline", get(row, "pipeline", "ticket pipeline"));
        setExtra(ticket.extra, "Source", row["source"] ?? "");
        setExtra(ticket.extra, "Issue of interest", row["issue of interest"] ?? "");
        setExtra(ticket.extra, "Issued ticket before", row["issued ticket before?"] ?? "");
        const assoc = splitList(row["associated company record id"] ?? "");
        if (assoc.length) setExtra(ticket.extra, "Associated HubSpot company IDs", assoc.join(", "));
        if (!ticket.description && row["ticket description"]) ticket.description = row["ticket description"]!;
        if (!ticket.description && row["issue of interest"]) ticket.description = `Issue: ${row["issue of interest"]}`;
        if (contact) {
          ticket.contactId ??= contact.id;
          ticket.companyId ??= contact.companyId;
        }
        if (company) ticket.companyId ??= company.id;
      }

      const rel = {
        contactId: contact?.id ?? deal?.contactId ?? null,
        companyId: company?.id ?? contact?.companyId ?? deal?.companyId ?? null,
        dealId: deal?.id ?? null,
        ticketId: ticket?.id ?? null,
      };
      const unmatched = get(row, "record id - contacts", "deal - record id");
      const addActivity = (a: Omit<Activity, "id" | "createdAt">, key: string) => {
        if (seenActivity.has(key)) return;
        seenActivity.add(key);
        activities.push({ ...a, id: id("a"), createdAt: a.date });
        bump(a.type === "note" ? "notes" : `${a.type}s`);
      };

      /* ---------- Call ---------- */
      if (row["call title"] || row["call notes"]) {
        const date = parseDate(row["activity date"]) ?? now;
        const minutes = Math.round(parseAmount(row["call duration"]) / 60000);
        const meta = [row["call direction"], row["call outcome"] || row["call status"], row["call source"], minutes ? `${minutes} min` : ""].filter(Boolean).join(" · ");
        addActivity(
          {
            type: "call",
            subject: row["call title"] || "Call",
            description: [row["call notes"], meta].filter(Boolean).join("\n"),
            date,
            status: new Date(date).getTime() > Date.now() ? "planned" : "completed",
            ownerId: owner(get(row, "activity assigned to")),
            ...rel,
          },
          `call|${norm(row["call title"] ?? "")}|${rel.contactId ?? norm(row["call notes"] ?? "")}|${row["call id"] ?? ""}`,
        );
      }

      /* ---------- Meeting ---------- */
      if (row["meeting name"]) {
        const date = parseDate(get(row, "meeting start time", "activity date")) ?? now;
        addActivity(
          {
            type: "meeting",
            subject: row["meeting name"]!,
            description: [row["meeting description"], row["meeting outcome"] && `Outcome: ${row["meeting outcome"]}`].filter(Boolean).join("\n"),
            date,
            status: new Date(date).getTime() > Date.now() ? "planned" : "completed",
            ownerId: owner(get(row, "activity assigned to")),
            ...rel,
          },
          `meeting|${norm(row["meeting name"]!)}|${date}|${rel.contactId ?? ""}`,
        );
      }

      /* ---------- Note ---------- */
      if (row["note body"]) {
        addActivity(
          {
            type: "note",
            subject: "Note",
            description: row["note body"]!,
            date: parseDate(row["activity date"]) ?? now,
            status: "completed",
            ownerId: owner(get(row, "activity assigned to")),
            ...rel,
          },
          `note|${norm(row["note body"]!)}|${row["activity date"] ?? ""}|${rel.companyId ?? ""}`,
        );
      }

      /* ---------- Email ---------- */
      if (row["email subject"]) {
        const scheduled = /scheduled/i.test(row["email send status"] ?? "");
        addActivity(
          {
            type: "email",
            subject: row["email subject"]!,
            description: [row["email body"], [row["email direction"], row["email send status"]].filter(Boolean).join(" · ")].filter(Boolean).join("\n"),
            date: parseDate(row["activity date"]) ?? now,
            status: scheduled ? "planned" : "completed",
            ownerId: owner(get(row, "activity assigned to")),
            ...rel,
          },
          `email|${norm(row["email subject"]!)}|${row["activity date"] ?? ""}|${rel.contactId ?? ""}`,
        );
        if (unmatched) rep.notes.push(`Email "${row["email subject"]}" references HubSpot contact ID ${unmatched}, which isn't in the CSV files — imported without a contact.`);
      }

      /* ---------- Task ---------- */
      if (row["task title"]) {
        const key = `${norm(row["task title"]!)}|${row["task id"] ?? ""}`;
        if (!seenTask.has(key)) {
          seenTask.add(key);
          const done = /complete/i.test(row["task status"] ?? "");
          const due = parseDate(row["due date"]) ?? now;
          const meta = [row["task type"] && `Type: ${row["task type"]}`, row["queue"] && `Queue: ${row["queue"]}`, row["task status"] && `HubSpot status: ${row["task status"]}`].filter(Boolean).join(" · ");
          tasks.push({
            id: id("t"),
            title: row["task title"]!,
            description: [row["notes"], meta].filter(Boolean).join("\n"),
            dueDate: due,
            priority: mapPriority(row["priority"] ?? ""),
            status: done ? "done" : "todo",
            assigneeId: owner(get(row, "assignted to", "assigned to", "activity assigned to")),
            contactId: rel.contactId,
            companyId: rel.companyId,
            dealId: rel.dealId,
            createdAt: now,
            completedAt: done ? due : null,
          });
          bump("tasks");
          if (unmatched) rep.notes.push(`Task "${row["task title"]}" references HubSpot deal ID ${unmatched}, which isn't in the CSV files — imported without a deal.`);
        }
      }
    }
    if (!Object.keys(rep.created).length && !rep.notes.length) rep.notes.push("All rows matched records already imported from other files (merged).");
    report.push(rep);
  }

  /* ---------- Owners ---------- */
  // Admins first (they are the default sign-in), then by number of assigned records.
  let userList = [...users.values()].sort((a, b) => Number(b.role === "Admin" && !!b.explicitRole) - Number(a.role === "Admin" && !!a.explicitRole) || b.refs - a.refs);
  if (!userList.length) userList = [{ id: "u1", name: "Workspace Admin", email: "admin@focuscrm.app", role: "Admin", color: USER_COLORS[0]!, refs: 0 }];
  if (!userList.some((u) => u.explicitRole)) userList[0]!.role = "Admin";
  const fallback = userList[0]!.id;
  const own = <T extends { ownerId: string }>(x: T) => (x.ownerId ||= fallback);
  companies.forEach(own);
  contacts.forEach(own);
  deals.forEach(own);
  activities.forEach(own);
  tasks.forEach((t) => (t.assigneeId ||= fallback));
  tickets.forEach((t) => (t.assigneeId ||= fallback));
  // Support-only users (ticket owners, ticket note authors) get the support role.
  const ticketPeople = new Set([...tickets.map((t) => t.assigneeId), ...activities.filter((a) => a.ticketId).map((a) => a.ownerId)]);
  userList.slice(1).forEach((u) => !u.explicitRole && ticketPeople.has(u.id) && (u.role = "Support Agent"));

  /* ---------- Derived links & statuses ---------- */
  contacts.forEach((c) => {
    if (!c.companyId && c.email) {
      const co = byDomain.get(c.email.split("@")[1] ?? "");
      if (co) c.companyId = co.id;
    }
  });
  deals.forEach((d) => {
    if (!d.companyId && d.contactId) d.companyId = contacts.find((c) => c.id === d.contactId)?.companyId ?? null;
    if ((d.stage === "won" || d.stage === "lost") && d.closeDate) {
      d.closedAt = d.closeDate;
      if (d.closedAt < d.createdAt) d.createdAt = d.closedAt;
    }
  });
  contacts.forEach((c) => {
    const mine = deals.filter((d) => d.contactId === c.id);
    c.status =
      c.lifecycle ??
      (mine.some((d) => d.stage === "won") || tickets.some((t) => t.contactId === c.id)
        ? "Customer"
        : mine.some((d) => d.stage !== "lost")
          ? "Prospect"
          : "Lead");
  });

  const events: TimelineEvent[] = [];
  const ev = (text: string, rel: Partial<TimelineEvent>, key: string, at = now) =>
    events.push({ id: id("e"), at, text: `${text} from “${sourceFile.get(key)}”`, userId: fallback, contactId: null, companyId: null, dealId: null, ticketId: null, ...rel });
  companies.forEach((c) => ev(`Company imported`, { companyId: c.id }, c.id, c.createdAt));
  contacts.forEach((c) => ev(`Contact imported`, { contactId: c.id, companyId: c.companyId }, c.id, c.createdAt));
  deals.forEach((d) => ev(`Deal "${d.name}" imported`, { dealId: d.id, contactId: d.contactId, companyId: d.companyId }, d.id, d.createdAt));
  tickets.forEach((t) => ev(`Ticket imported`, { ticketId: t.id, contactId: t.contactId, companyId: t.companyId }, t.id, t.createdAt));

  const strip = <T extends object>(xs: T[], ...keys: string[]) =>
    xs.map((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !keys.includes(k))) as T);

  return {
    importedAt: now,
    report,
    data: {
      users: userList.map(({ refs: _refs, explicitRole: _explicit, ...u }) => u),
      companies,
      contacts: strip(contacts, "lifecycle"),
      deals,
      activities,
      tasks,
      tickets,
      events,
    },
  };
}
