import type {
  ActivityType,
  ContactStatus,
  DealStage,
  LeadSource,
  Priority,
  TicketPriority,
  TicketStatus,
} from "./types";

export type Tone = "gray" | "blue" | "green" | "amber" | "red" | "violet" | "cyan" | "orange";

export const STAGES: { id: DealStage; label: string; tone: Tone; probability: number; color: string }[] = [
  { id: "new", label: "New Lead", tone: "gray", probability: 10, color: "#8B93A7" },
  { id: "contacted", label: "Contacted", tone: "cyan", probability: 20, color: "#0EA5C6" },
  { id: "qualified", label: "Qualified", tone: "violet", probability: 40, color: "#7C5CF0" },
  { id: "proposal", label: "Proposal", tone: "blue", probability: 60, color: "#4054E8" },
  { id: "negotiation", label: "Negotiation", tone: "amber", probability: 80, color: "#E08A00" },
  { id: "won", label: "Won", tone: "green", probability: 100, color: "#16A34A" },
  { id: "lost", label: "Lost", tone: "red", probability: 0, color: "#E5484D" },
];

export const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<DealStage, (typeof STAGES)[number]>;
export const OPEN_STAGES: DealStage[] = ["new", "contacted", "qualified", "proposal", "negotiation"];

export const CONTACT_STATUSES: ContactStatus[] = ["Lead", "Prospect", "Customer", "Inactive"];
export const CONTACT_STATUS_TONE: Record<ContactStatus, Tone> = {
  Lead: "blue",
  Prospect: "violet",
  Customer: "green",
  Inactive: "gray",
};

export const LEAD_SOURCES: LeadSource[] = ["Import", "Website", "Referral", "LinkedIn", "Cold Outreach", "Events", "Partner"];

export const PRIORITIES: Priority[] = ["Low", "Medium", "High"];
export const PRIORITY_TONE: Record<Priority | TicketPriority, Tone> = {
  Low: "gray",
  Medium: "amber",
  High: "red",
  Urgent: "red",
};

export const TICKET_STATUSES: TicketStatus[] = ["Open", "In Progress", "Waiting", "Resolved", "Closed"];
export const TICKET_PRIORITIES: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];
export const TICKET_STATUS_TONE: Record<TicketStatus, Tone> = {
  Open: "blue",
  "In Progress": "violet",
  Waiting: "amber",
  Resolved: "green",
  Closed: "gray",
};
export const OPEN_TICKET_STATUSES: TicketStatus[] = ["Open", "In Progress", "Waiting"];

export const ACTIVITY_TYPES: { id: ActivityType; label: string; tone: Tone }[] = [
  { id: "call", label: "Call", tone: "green" },
  { id: "email", label: "Email", tone: "blue" },
  { id: "meeting", label: "Meeting", tone: "violet" },
  { id: "note", label: "Note", tone: "amber" },
  { id: "follow-up", label: "Follow-up", tone: "cyan" },
];
export const ACTIVITY_MAP = Object.fromEntries(ACTIVITY_TYPES.map((a) => [a.id, a])) as Record<
  ActivityType,
  (typeof ACTIVITY_TYPES)[number]
>;

export const INDUSTRIES = [
  "IT Services",
  "SaaS",
  "Manufacturing",
  "Healthcare",
  "Finance",
  "Retail",
  "Logistics",
  "Education",
  "Media",
  "Real Estate",
  "Hospitality",
  "Energy",
  "Legal",
  "Professional Services",
  "Nonprofit",
];

export const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"];
