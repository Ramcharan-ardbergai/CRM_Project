export type ID = string;

export type Role = "Admin" | "Sales Manager" | "Account Executive" | "Support Agent";

export interface User {
  id: ID;
  name: string;
  email: string;
  role: Role;
  color: string;
}

export interface Company {
  id: ID;
  name: string;
  industry: string;
  website: string;
  phone: string;
  city: string;
  country: string;
  employees: string;
  ownerId: ID;
  createdAt: string;
  /** Extra properties carried over from imported files. */
  extra?: Record<string, string>;
}

export type ContactStatus = "Lead" | "Prospect" | "Customer" | "Inactive";
export type LeadSource = "Import" | "Website" | "Referral" | "LinkedIn" | "Cold Outreach" | "Events" | "Partner";

export interface Contact {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  companyId: ID | null;
  status: ContactStatus;
  source: LeadSource;
  ownerId: ID;
  createdAt: string;
  extra?: Record<string, string>;
}

export type DealStage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type Priority = "Low" | "Medium" | "High";

export interface Deal {
  id: ID;
  name: string;
  companyId: ID | null;
  contactId: ID | null;
  amount: number;
  stage: DealStage;
  probability: number;
  closeDate: string;
  ownerId: ID;
  priority: Priority;
  createdAt: string;
  closedAt: string | null;
  extra?: Record<string, string>;
}

export type ActivityType = "call" | "email" | "meeting" | "note" | "follow-up";
export type ActivityStatus = "planned" | "completed";

export interface Activity {
  id: ID;
  type: ActivityType;
  subject: string;
  description: string;
  date: string;
  status: ActivityStatus;
  ownerId: ID;
  contactId: ID | null;
  companyId: ID | null;
  dealId: ID | null;
  ticketId: ID | null;
  createdAt: string;
}

export type TaskStatus = "todo" | "done";

export interface Task {
  id: ID;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  assigneeId: ID;
  contactId: ID | null;
  companyId: ID | null;
  dealId: ID | null;
  createdAt: string;
  completedAt: string | null;
}

export type TicketStatus = "Open" | "In Progress" | "Waiting" | "Resolved" | "Closed";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

export interface Ticket {
  id: ID;
  number: number;
  subject: string;
  description: string;
  contactId: ID | null;
  companyId: ID | null;
  priority: TicketPriority;
  status: TicketStatus;
  assigneeId: ID;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  extra?: Record<string, string>;
}

/** System-generated history entries (stage changes, status changes, creations). */
export interface TimelineEvent {
  id: ID;
  at: string;
  text: string;
  userId: ID;
  contactId: ID | null;
  companyId: ID | null;
  dealId: ID | null;
  ticketId: ID | null;
}

export interface Settings {
  workspace: string;
  currency: "INR" | "USD";
  theme: "light" | "dark";
}

export interface CRMData {
  users: User[];
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
  tasks: Task[];
  tickets: Ticket[];
  events: TimelineEvent[];
}

export type EntityKind = "contact" | "company" | "deal" | "task" | "activity" | "ticket";

/** Links a record to the CRM entities it relates to. */
export interface Relations {
  contactId?: ID | null;
  companyId?: ID | null;
  dealId?: ID | null;
  ticketId?: ID | null;
}
