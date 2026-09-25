// Generates additional HubSpot-style CSV files in /Data so the CRM has a realistic volume of records.
// The original HubSpot sample files are left untouched; the app imports both together.
//
//   npm run generate-data            (dates are relative to today)
//
// Output files are prefixed "Generated - " and are safe to delete or regenerate.
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "Data");
const PREFIX = "Generated - ";
const DAY = 86_400_000;
const NOW = Date.now();

/* ---------- deterministic randomness ---------- */
let seed = 20260925;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (a) => a[Math.floor(rand() * a.length)];
const between = (a, b) => Math.floor(a + rand() * (b - a + 1));
const chance = (p) => rand() < p;
const weighted = (pairs) => {
  let r = rand() * pairs.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[0][0];
};

/** US-style "M/D/YYYY HH:mm", the format HubSpot exports use. */
const fmt = (ms, withTime = true) => {
  const d = new Date(ms);
  const date = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  if (!withTime) return date;
  return `${date} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const at = (daysFromNow, hourMin = 9, hourMax = 17) => {
  const d = new Date(NOW + daysFromNow * DAY);
  d.setHours(between(hourMin, hourMax), pick([0, 15, 30, 45]), 0, 0);
  return d.getTime();
};

/* ---------- team ---------- */
const team = [
  { email: "mmitchell@hubspot.com", first: "Morgan", last: "Mitchell", role: "Admin" },
  { email: "aisha.khan@focuscrm.demo", first: "Aisha", last: "Khan", role: "Sales Manager" },
  { email: "daniel.okafor@focuscrm.demo", first: "Daniel", last: "Okafor", role: "Account Executive" },
  { email: "sofia.martinez@focuscrm.demo", first: "Sofia", last: "Martinez", role: "Account Executive" },
  { email: "ravi.menon@focuscrm.demo", first: "Ravi", last: "Menon", role: "Account Executive" },
  { email: "useremail@test.com", first: "Casey", last: "Brooks", role: "Support Agent" },
  { email: "useremail2@test.com", first: "Taylor", last: "Reed", role: "Support Agent" },
];
const sales = team.slice(0, 5).map((u) => u.email);
const support = team.slice(5).map((u) => u.email);

/* ---------- companies ---------- */
const companySeeds = [
  ["Brightline Analytics", "SaaS", "Austin", "United States"],
  ["Harborview Logistics", "Logistics", "Seattle", "United States"],
  ["Northpeak Outdoor Co.", "Retail", "Denver", "United States"],
  ["Cobalt Health Clinics", "Healthcare", "Boston", "United States"],
  ["Meridian Freight Lines", "Logistics", "Chicago", "United States"],
  ["Silverleaf Hotels", "Hospitality", "San Diego", "United States"],
  ["Quantum Ridge Labs", "SaaS", "San Jose", "United States"],
  ["Evergreen Dental Group", "Healthcare", "Portland", "United States"],
  ["Atlas Manufacturing", "Manufacturing", "Detroit", "United States"],
  ["Bluewater Insurance", "Finance", "Hartford", "United States"],
  ["Crescent Media House", "Media", "Los Angeles", "United States"],
  ["Pinecrest Academy", "Education", "Raleigh", "United States"],
  ["Summit Legal Partners", "Legal", "New York", "United States"],
  ["Ironwood Construction", "Real Estate", "Phoenix", "United States"],
  ["Lumen Solar Systems", "Energy", "Sacramento", "United States"],
  ["Redfern Coffee Roasters", "Hospitality", "Seattle", "United States"],
  ["Tidewater Marine Supply", "Retail", "Charleston", "United States"],
  ["Vantage Point Realty", "Real Estate", "Miami", "United States"],
  ["Keystone Credit Union", "Finance", "Pittsburgh", "United States"],
  ["Orchard Lane Grocers", "Retail", "Columbus", "United States"],
  ["Nimbus Cloud Services", "IT Services", "Dublin", "Ireland"],
  ["Kestrel Aerospace", "Manufacturing", "Bristol", "United Kingdom"],
  ["Thornbury Architects", "Professional Services", "London", "United Kingdom"],
  ["Waverly Fashion Group", "Retail", "Manchester", "United Kingdom"],
  ["Granite Peak Software", "SaaS", "Toronto", "Canada"],
  ["Maple Street Bakery", "Hospitality", "Vancouver", "Canada"],
  ["Aurora Biotech", "Healthcare", "Cambridge", "United Kingdom"],
  ["Sterling Wealth Advisors", "Finance", "Edinburgh", "United Kingdom"],
  ["Indigo Learning", "Education", "Bengaluru", "India"],
  ["Saffron Hospitality", "Hospitality", "Mumbai", "India"],
  ["Techwave Solutions", "IT Services", "Hyderabad", "India"],
  ["Coral Reef Resorts", "Hospitality", "Goa", "India"],
  ["Pioneer Agritech", "Manufacturing", "Pune", "India"],
  ["Orbit Telecom", "IT Services", "Singapore", "Singapore"],
  ["Sakura Design Studio", "Media", "Osaka", "Japan"],
  ["Helios Energy Partners", "Energy", "Houston", "United States"],
  ["Windmill Data Co.", "SaaS", "Amsterdam", "Netherlands"],
  ["Bramble & Oak Furniture", "Retail", "Nashville", "United States"],
  ["Cascade Veterinary", "Healthcare", "Boise", "United States"],
  ["Lighthouse Nonprofit Network", "Nonprofit", "Baltimore", "United States"],
];
const sizes = ["11-50", "51-200", "201-500", "501-1000", "1001-5000"];
const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
const phoneFor = (country) =>
  country === "India" ? `+91 ${between(70000, 99999)} ${between(10000, 99999)}`
  : country === "United Kingdom" ? `+44 20 ${between(1000, 9999)} ${between(1000, 9999)}`
  : `+1 ${between(201, 989)}-${between(200, 999)}-${between(1000, 9999)}`;

const companies = companySeeds.map(([name, industry, city, country], i) => ({
  name,
  domain: `${slug(name)}.com`,
  industry,
  city,
  country,
  employees: pick(sizes),
  phone: phoneFor(country),
  owner: sales[i % sales.length],
  created: at(-between(200, 420)),
}));

/* ---------- contacts ---------- */
const firstNames = ["Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Mia", "Lucas", "Harper", "Mason", "Amelia", "Logan", "Chloe", "Elijah", "Grace", "James", "Zoe", "Benjamin", "Nora", "Henry", "Priya", "Arjun", "Ananya", "Rohan", "Meera", "Kenji", "Yuki", "Fatima", "Omar", "Leila", "Mateo", "Lucia", "Hannah", "Samuel", "Isla", "Jack", "Freya", "Oscar", "Maya", "Caleb"];
const lastNames = ["Anderson", "Brooks", "Carter", "Diaz", "Evans", "Foster", "Garcia", "Hughes", "Iyer", "Johnson", "Kim", "Lopez", "Morgan", "Nguyen", "Owens", "Patel", "Quinn", "Rivera", "Sato", "Thompson", "Underwood", "Vasquez", "Walsh", "Xu", "Young", "Zimmerman", "Bennett", "Chen", "Dubois", "Fischer", "Gupta", "Hansen", "Rao", "Shah", "Tanaka", "Wright"];
const titles = ["CEO", "COO", "CFO", "VP of Sales", "Head of Operations", "IT Director", "Marketing Manager", "Procurement Lead", "Office Manager", "Product Manager", "Customer Success Lead", "Founder", "Finance Manager", "HR Director"];
const sources = [["Website", 6], ["Referral", 4], ["LinkedIn", 4], ["Events", 2], ["Cold Outreach", 2], ["Partner", 1]];

const usedNames = new Set(["lorelaigilmore", "leslieknope", "eleanorshellstrop", "lukedanes", "johnsmith", "annsmith", "michaelscott", "monicagellar"]);
const contacts = [];
for (const co of companies) {
  const n = between(2, 4);
  for (let k = 0; k < n; k++) {
    let first, last;
    do {
      first = pick(firstNames);
      last = pick(lastNames);
    } while (usedNames.has((first + last).toLowerCase()));
    usedNames.add((first + last).toLowerCase());
    contacts.push({
      first,
      last,
      email: `${first}.${last}@${co.domain}`.toLowerCase(),
      phone: phoneFor(co.country),
      title: k === 0 ? pick(["CEO", "COO", "Founder", "VP of Sales"]) : pick(titles),
      company: co,
      source: weighted(sources),
      owner: co.owner,
      // Skew creation toward recent months so customer growth is visible.
      created: Math.max(co.created, at(-Math.floor(Math.pow(rand(), 1.5) * 360))),
    });
  }
}
const contactsOf = (co) => contacts.filter((c) => c.company === co);

/* ---------- deals ---------- */
const products = ["Annual Subscription", "Platform Upgrade", "Onboarding Package", "Enterprise License", "Data Migration", "Support Retainer", "Website Rebuild", "Mobile App", "Analytics Add-on", "Security Audit", "Training Workshop", "Hardware Refresh", "Integration Project", "Managed Services", "Expansion Seats"];
const hubspotStage = {
  new: "New",
  contacted: "Appointment scheduled",
  qualified: "Qualified to buy",
  proposal: "Presentation scheduled",
  negotiation: "Contract sent",
  won: "Closed won",
  lost: "Closed lost",
};
const usedDeal = new Set();
const deals = [];
const makeDeal = (stage, createdDaysAgo, closedDaysAgo) => {
  const co = pick(companies);
  const people = contactsOf(co);
  const contact = pick(people);
  const base = `${co.name.split(" ")[0]} ${pick(products)}`;
  let name = base;
  for (let n = 2; usedDeal.has(name); n++) name = `${base} (${n})`;
  usedDeal.add(name);
  const created = at(-createdDaysAgo);
  const closed = closedDaysAgo == null ? null : at(-closedDaysAgo);
  const amount = Math.round((between(3, 95) * 1000 + weighted([[0, 4], [between(5, 40) * 1000, 1]])) / 500) * 500;
  deals.push({
    name,
    stage,
    company: co,
    contact,
    amount,
    created,
    close: closed ?? at(between(-5, 75)),
    owner: chance(0.8) ? co.owner : pick(sales),
    priority: weighted([["High", 2], ["Medium", 4], ["Low", 2]]),
  });
};
// Closed deals across the last 12 months, trending upward.
for (let m = 11; m >= 0; m--) {
  const wins = 1 + Math.round((11 - m) * 0.18 + rand() * 1.4);
  for (let k = 0; k < wins; k++) {
    const closed = m * 30 + between(0, 27);
    makeDeal("won", closed + between(14, 75), closed);
  }
  const losses = between(1, 2);
  for (let k = 0; k < losses; k++) {
    const closed = m * 30 + between(0, 27);
    makeDeal("lost", closed + between(10, 60), closed);
  }
}
for (const [stage, count] of [["new", 11], ["contacted", 12], ["qualified", 10], ["proposal", 9], ["negotiation", 7]]) {
  for (let k = 0; k < count; k++) makeDeal(stage, between(2, 90), null);
}
const openDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));

// Lifecycle follows the deals.
const lifecycle = new Map();
const lifecycleOf = (c) => {
  if (lifecycle.has(c)) return lifecycle.get(c);
  const mine = deals.filter((d) => d.company === c.company);
  const v = mine.some((d) => d.contact === c && d.stage === "won")
    ? chance(0.85) ? "Customer" : "Evangelist"
    : mine.some((d) => d.contact === c && !["won", "lost"].includes(d.stage))
      ? "Opportunity"
      : mine.some((d) => d.stage === "won") && chance(0.35)
        ? "Customer"
        : mine.some((d) => !["won", "lost"].includes(d.stage))
          ? chance(0.5) ? "Sales Qualified Lead" : "Lead"
          : chance(0.2) ? "Other" : "Lead";
  lifecycle.set(c, v);
  return v;
};

/* ---------- activities ---------- */
const callTitles = ["Discovery call", "Pricing discussion", "Check-in call", "Proposal walkthrough", "Renewal call", "Requirements call", "Follow-up call"];
const callNotes = [
  "Walked through current process and pain points. Strong interest in automation.",
  "Discussed pricing tiers; they want a quote for the annual plan.",
  "Left voicemail, will try again later this week.",
  "Confirmed budget is approved for next quarter.",
  "Reviewed the proposal line by line. Legal review next.",
  "They are comparing us with two other vendors.",
  "Great call — champion will introduce us to the CFO.",
];
const emailSubjects = ["Proposal attached", "Following up on our call", "Case study you asked for", "Contract for review", "Quick question about timelines", "Onboarding next steps", "Renewal reminder", "Meeting recap and next steps"];
const meetingNames = ["Product demo", "Stakeholder meeting", "Quarterly business review", "Onsite workshop", "Contract negotiation", "Implementation kickoff", "Executive briefing"];
const noteBodies = [
  "Decision maker is the COO; procurement needs three quotes.",
  "Budget cycle resets in January.",
  "Prefers email over calls for quick updates.",
  "Current vendor contract ends next quarter.",
  "Very happy with onboarding; potential upsell to more seats.",
  "Security questionnaire required before signing.",
  "Asked for a reference customer in the same industry.",
];

const calls = [], meetings = [], emails = [], notes = [];
for (let i = 0; i < 110; i++) {
  const deal = chance(0.6) ? pick(deals) : null;
  const contact = deal ? deal.contact : pick(contacts);
  const days = Math.floor(Math.pow(rand(), 1.4) * 150);
  calls.push({
    id: `CALL-${i + 1}`,
    title: pick(callTitles),
    notes: pick(callNotes),
    direction: weighted([["Outbound", 3], ["Inbound", 1]]),
    status: "Completed",
    outcome: weighted([["Connected", 5], ["Left voicemail", 2], ["No answer", 1], ["Busy", 1]]),
    duration: between(3, 45) * 60000,
    date: at(-days),
    owner: deal?.owner ?? contact.owner,
    contact,
    deal: deal && !["won", "lost"].includes(deal.stage) ? deal : null,
  });
}
for (let i = 0; i < 80; i++) {
  const deal = chance(0.55) ? pick(deals) : null;
  const contact = deal ? deal.contact : pick(contacts);
  const scheduled = i < 6;
  emails.push({
    subject: pick(emailSubjects),
    body: `Hi ${contact.first}, ${pick(["sharing the details we discussed.", "just checking in on the next steps.", "attached is the document you requested.", "let me know a good time to connect this week."])}`,
    direction: weighted([["Outgoing", 3], ["Incoming", 2]]),
    status: scheduled ? "Scheduled" : "Sent",
    date: scheduled ? at(between(1, 7)) : at(-Math.floor(Math.pow(rand(), 1.4) * 150)),
    owner: deal?.owner ?? contact.owner,
    contact,
    deal: deal && !["won", "lost"].includes(deal.stage) ? deal : null,
  });
}
for (let i = 0; i < 55; i++) {
  const upcoming = i < 16;
  const deal = upcoming ? pick(openDeals) : chance(0.6) ? pick(deals) : null;
  const contact = deal ? deal.contact : pick(contacts);
  meetings.push({
    name: pick(meetingNames),
    description: `${pick(meetingNames)} with ${contact.first} ${contact.last} (${contact.company.name}).`,
    outcome: upcoming ? "" : pick(["Completed", "Rescheduled", "Completed", "Completed"]),
    date: upcoming ? at(between(0, 21), 9, 16) : at(-Math.floor(Math.pow(rand(), 1.3) * 150), 9, 16),
    owner: deal?.owner ?? contact.owner,
    contact,
    deal: deal && !["won", "lost"].includes(deal.stage) ? deal : null,
  });
}
for (let i = 0; i < 45; i++) {
  const co = pick(companies);
  notes.push({ body: pick(noteBodies), date: at(-between(1, 200)), owner: co.owner, company: co });
}

/* ---------- tasks ---------- */
const taskVerbs = [["Send proposal to", "Email"], ["Follow up with", "Call"], ["Schedule demo with", "Call"], ["Prepare quote for", "To-do"], ["Share contract with", "Email"], ["Book QBR with", "Call"], ["Review requirements from", "To-do"], ["Send invoice to", "Email"]];
const tasks = [];
for (let i = 0; i < 70; i++) {
  const deal = chance(0.7) ? pick(openDeals) : null;
  const contact = deal ? deal.contact : pick(contacts);
  const [verb, type] = pick(taskVerbs);
  const offset = between(-12, 21);
  const done = offset < -2 ? chance(0.65) : chance(0.12);
  tasks.push({
    id: `TASK-${i + 1}`,
    title: `${verb} ${contact.company.name}`,
    notes: deal ? `Related to ${deal.name}.` : `Keep ${contact.first} warm.`,
    due: at(offset),
    priority: weighted([["High", 2], ["Medium", 4], ["Low", 2]]),
    status: done ? "Completed" : weighted([["Not started", 3], ["In progress", 1]]),
    type,
    owner: i % 4 === 0 ? pick(sales) : deal?.owner ?? contact.owner,
    contact,
    deal,
  });
}

/* ---------- tickets ---------- */
const ticketSubjects = [
  ["Unable to log in after password reset", "Login"],
  ["Invoice total doesn't match the quote", "Billing Issue"],
  ["CSV export times out", "Data export"],
  ["Request for additional user licenses", "Licensing"],
  ["Calendar sync not updating", "Integration"],
  ["Dashboard loads slowly", "Performance"],
  ["Need training for new team members", "Training"],
  ["API returns rate limit errors", "API"],
  ["Report totals look incorrect", "Reporting"],
  ["Mobile app crashes on launch", "App"],
  ["Change billing contact", "Billing Issue"],
  ["Help configuring single sign-on", "SSO"],
  ["Duplicate records after import", "Import Error"],
  ["Email notifications not received", "Notifications"],
];
const customers = contacts.filter((c) => deals.some((d) => d.company === c.company && d.stage === "won"));
const tickets = [];
for (let i = 0; i < 48; i++) {
  const contact = pick(customers);
  const [subject, issue] = pick(ticketSubjects);
  const age = Math.floor(Math.pow(rand(), 1.3) * 90);
  const status = age > 20
    ? weighted([["Closed", 5], ["Waiting on contact", 1]])
    : weighted([["New", 4], ["Waiting on us", 3], ["Waiting on contact", 2], ["Closed", 2]]);
  const created = at(-age);
  tickets.push({
    id: `TCK-${2001 + i}`,
    subject,
    description: `${contact.first} from ${contact.company.name} reports: ${subject.toLowerCase()}.`,
    status,
    priority: weighted([["Low", 3], ["Medium", 4], ["High", 2], ["Urgent", 1]]),
    owner: pick(support),
    source: pick(["Email", "Phone", "Chat", "Form"]),
    issue,
    created,
    closed: status === "Closed" ? Math.min(NOW, created + between(2, 120) * 3_600_000) : null,
    contact,
  });
}

/* ---------- write CSV files ---------- */
const csv = (rows) =>
  rows.map((r) => r.map((v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n") + "\n";

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.startsWith(PREFIX)) unlinkSync(path.join(OUT, f));

const files = {
  "Team.csv": [
    ["User email", "User first name", "User last name", "User role"],
    ...team.map((u) => [u.email, u.first, u.last, u.role]),
  ],
  "Companies.csv": [
    ["Name", "Company domain name", "Industry", "Number of employees", "City", "Country/Region", "Phone number", "Company owner", "Create date"],
    ...companies.map((c) => [c.name, c.domain, c.industry, c.employees, c.city, c.country, c.phone, c.owner, fmt(c.created)]),
  ],
  "Contacts.csv": [
    ["First Name", "Last Name", "Email", "Mobile phone number", "Job title", "Lifecycle stage", "Original source", "Contact owner", "Create date", "Company name", "Company domain name"],
    ...contacts.map((c) => [c.first, c.last, c.email, c.phone, c.title, lifecycleOf(c), c.source, c.owner, fmt(c.created), c.company.name, c.company.domain]),
  ],
  "Deals.csv": [
    ["Deal name", "Deal stage", "Pipeline", "Amount", "Create date", "Close date", "Deal owner", "Deal priority", "Point of contact", "Company name", "Company domain name"],
    ...deals.map((d) => [d.name, hubspotStage[d.stage], "Sales Pipeline", d.amount, fmt(d.created), fmt(d.close, false), d.owner, d.priority, `${d.contact.first} ${d.contact.last}`, d.company.name, d.company.domain]),
  ],
  "Calls.csv": [
    ["Call id", "Call title", "Call notes", "Call direction", "Call status", "Call outcome", "Call duration", "Activity date", "Activity assigned to", "Email", "Deal name"],
    ...calls.map((c) => [c.id, c.title, c.notes, c.direction, c.status, c.outcome, c.duration, fmt(c.date), c.owner, c.contact.email, c.deal?.name ?? ""]),
  ],
  "Emails.csv": [
    ["Email subject", "Email body", "Email direction", "Email send status", "Activity date", "Activity assigned to", "Email", "Deal name"],
    ...emails.map((e) => [e.subject, e.body, e.direction, e.status, fmt(e.date), e.owner, e.contact.email, e.deal?.name ?? ""]),
  ],
  "Meetings.csv": [
    ["Meeting name", "Meeting description", "Meeting start time", "Meeting outcome", "Activity assigned to", "Email", "Deal name"],
    ...meetings.map((m) => [m.name, m.description, fmt(m.date), m.outcome, m.owner, m.contact.email, m.deal?.name ?? ""]),
  ],
  "Notes.csv": [
    ["Note body", "Activity date", "Activity assigned to", "Company domain name"],
    ...notes.map((n) => [n.body, fmt(n.date), n.owner, n.company.domain]),
  ],
  "Tasks.csv": [
    ["Task id", "Task title", "Notes", "Due date", "Priority", "Task status", "Task type", "Assigned to", "Email", "Deal name"],
    ...tasks.map((t) => [t.id, t.title, t.notes, fmt(t.due), t.priority, t.status, t.type, t.owner, t.contact.email, t.deal?.name ?? ""]),
  ],
  "Tickets.csv": [
    ["Ticket id", "Ticket name", "Ticket description", "Pipeline", "Ticket status", "Priority", "Ticket owner", "Source", "Issue of interest", "Create date", "Close date", "Email"],
    ...tickets.map((t) => [t.id, t.subject, t.description, "Support Pipeline", t.status, t.priority, t.owner, t.source, t.issue, fmt(t.created), t.closed ? fmt(t.closed) : "", t.contact.email]),
  ],
};

for (const [name, rows] of Object.entries(files)) {
  writeFileSync(path.join(OUT, PREFIX + name), csv(rows), "utf8");
  console.log(`${PREFIX}${name}: ${rows.length - 1} rows`);
}
