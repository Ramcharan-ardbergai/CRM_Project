"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ACTIVITY_TYPES,
  CONTACT_STATUSES,
  EMPLOYEE_RANGES,
  INDUSTRIES,
  LEAD_SOURCES,
  PRIORITIES,
  STAGE_MAP,
  STAGES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "@/lib/constants";
import { contactName } from "@/lib/hooks";
import { useCRM, useMeId, type CollectionKey } from "@/lib/store";
import type { EntityKind } from "@/lib/types";
import { toast, useUI } from "@/lib/ui-store";
import { DAY, fromDateInput, toDateInput, toDateTimeInput } from "@/lib/utils";
import { Modal } from "../ui/overlay";
import { Button, Field, Input, Segmented, Select, Textarea } from "../ui/primitives";
import { SearchSelect, type SearchOption } from "../ui/SearchSelect";
import Link from "next/link";
import { Building2 } from "lucide-react";

type Values = Record<string, string>;
type Errors = Record<string, string>;

const KEY: Record<EntityKind, CollectionKey> = {
  contact: "contacts",
  company: "companies",
  deal: "deals",
  task: "tasks",
  activity: "activities",
  ticket: "tickets",
};
const LABEL: Record<EntityKind, string> = { contact: "Contact", company: "Company", deal: "Deal", task: "Task", activity: "Activity", ticket: "Ticket" };

const DATE_FIELDS = new Set(["closeDate", "dueDate"]);
const DATETIME_FIELDS = new Set(["date"]);
const NUMBER_FIELDS = new Set(["amount", "probability"]);
const NULLABLE = new Set(["companyId", "contactId", "dealId", "ticketId"]);

function defaultsFor(kind: EntityKind, me: string): Values {
  const soon = (d: number) => new Date(Date.now() + d * DAY).toISOString();
  switch (kind) {
    case "contact":
      return { firstName: "", lastName: "", email: "", phone: "", title: "", companyId: "", status: "Lead", source: "Website", ownerId: me };
    case "company":
      return { name: "", industry: INDUSTRIES[0]!, website: "", phone: "", city: "", country: "India", employees: "11-50", ownerId: me };
    case "deal":
      return { name: "", amount: "", companyId: "", contactId: "", stage: "new", probability: "10", closeDate: toDateInput(soon(30)), ownerId: me, priority: "Medium" };
    case "task":
      return { title: "", description: "", dueDate: toDateInput(soon(1)), priority: "Medium", status: "todo", assigneeId: me, contactId: "", companyId: "", dealId: "" };
    case "activity":
      return { type: "call", subject: "", description: "", date: toDateTimeInput(new Date().toISOString()), status: "completed", ownerId: me, contactId: "", companyId: "", dealId: "", ticketId: "" };
    case "ticket":
      return { subject: "", description: "", contactId: "", companyId: "", priority: "Medium", status: "Open", assigneeId: me };
  }
}

/** Converts a stored record into string form values. */
function toValues(record: Record<string, unknown>): Values {
  const out: Values = {};
  for (const [k, v] of Object.entries(record)) {
    if (DATE_FIELDS.has(k)) out[k] = toDateInput(v as string);
    else if (DATETIME_FIELDS.has(k)) out[k] = toDateTimeInput(v as string);
    else out[k] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}

function toRecord(values: Values, template: Values) {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(template)) {
    const v = (values[k] ?? "").trim?.() ?? values[k];
    if (DATE_FIELDS.has(k) || DATETIME_FIELDS.has(k)) out[k] = fromDateInput(v);
    else if (NUMBER_FIELDS.has(k)) out[k] = Number(v) || 0;
    else if (NULLABLE.has(k)) out[k] = v || null;
    else out[k] = v;
  }
  return out;
}

function validate(kind: EntityKind, v: Values): Errors {
  const e: Errors = {};
  const req = (k: string, msg = "Required") => !v[k]?.trim() && (e[k] = msg);
  if (kind === "contact") {
    req("firstName");
    req("lastName");
    req("email");
    if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) e.email = "Enter a valid email";
  }
  if (kind === "company") req("name");
  if (kind === "deal") {
    req("name");
    req("closeDate");
    if (!(Number(v.amount) > 0)) e.amount = "Enter an amount greater than 0";
  }
  if (kind === "task") {
    req("title");
    req("dueDate");
  }
  if (kind === "activity") {
    req("subject");
    req("date");
  }
  if (kind === "ticket") req("subject");
  return e;
}

export function FormHost() {
  const req = useUI((s) => s.form);
  const close = useUI((s) => s.closeForm);
  // Remount per request so state resets cleanly.
  return req ? <EntityForm key={`${req.kind}-${req.id ?? "new"}-${JSON.stringify(req.defaults ?? {})}`} {...req} onClose={close} /> : null;
}

function EntityForm({ kind, id, defaults, onClose }: { kind: EntityKind; id?: string; defaults?: Record<string, unknown>; onClose: () => void }) {
  const me = useMeId();
  const state = useCRM();
  const key = KEY[kind];
  const existing = id ? (state[key] as { id: string }[]).find((r) => r.id === id) : undefined;
  const template = useMemo(() => defaultsFor(kind, me), [kind, me]);
  const [values, setValues] = useState<Values>(() => ({
    ...template,
    ...(existing ? toValues(existing as Record<string, unknown>) : {}),
    ...(defaults ? toValues(defaults) : {}),
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => {
    setValues((s) => {
      const next = { ...s, [k]: v };
      // Keep relations consistent.
      if (k === "stage") next.probability = String(STAGE_MAP[v as keyof typeof STAGE_MAP].probability);
      if (k === "contactId" && v) {
        const c = state.contacts.find((x) => x.id === v);
        if (c?.companyId && "companyId" in next) next.companyId = c.companyId;
      }
      if (k === "companyId" && next.contactId) {
        const c = state.contacts.find((x) => x.id === next.contactId);
        if (c && c.companyId !== v) next.contactId = "";
      }
      if (k === "dealId" && v) {
        const d = state.deals.find((x) => x.id === v);
        if (d) {
          next.companyId = d.companyId ?? "";
          next.contactId = d.contactId ?? "";
        }
      }
      return next;
    });
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const save = async () => {
    const errs = validate(kind, values);
    if (Object.values(errs).some(Boolean)) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 250)); // brief feedback for the save action
    const record = toRecord(values, template);
    if (existing) {
      state.update(key, existing.id, record);
      toast.success(`${LABEL[kind]} updated`);
    } else {
      if (kind === "task") record.completedAt = null;
      if (kind === "deal") record.closedAt = null;
      if (kind === "ticket") {
        record.number = Math.max(1040, ...state.tickets.map((t) => t.number)) + 1;
        record.updatedAt = new Date().toISOString();
        record.resolvedAt = null;
      }
      state.add(key, record as never);
      toast.success(`${LABEL[kind]} created`, kind === "deal" ? "Pipeline updated" : undefined);
    }
    setSaving(false);
    onClose();
  };

  const text = (k: string, label: string, p: React.InputHTMLAttributes<HTMLInputElement> = {}, required = false) => (
    <Field label={label} error={errors[k]} required={required}>
      <Input value={values[k] ?? ""} onChange={(e) => set(k, e.target.value)} invalid={!!errors[k]} {...p} />
    </Field>
  );
  const select = (k: string, label: string, options: { value: string; label: string }[], empty?: string) => {
    const v = values[k] ?? "";
    // Keep imported values that aren't in the standard list.
    const all = v && !options.some((o) => o.value === v) ? [{ value: v, label: v }, ...options] : options;
    return (
      <Field label={label} error={errors[k]}>
        <Select value={v} onChange={(e) => set(k, e.target.value)}>
          {empty !== undefined && <option value="">{empty}</option>}
          {!v && empty === undefined && <option value="">Select…</option>}
          {all.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>
    );
  };
  /** Searchable picker for related records. */
  const search = (k: string, label: string, options: SearchOption[], empty: string, onCreate?: (text: string) => string, createLabel?: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`f-${k}`} className="text-[13px] font-medium text-fg-2">{label}</label>
      <SearchSelect id={`f-${k}`} value={values[k] ?? ""} onChange={(v) => set(k, v)} options={options} emptyLabel={empty} onCreate={onCreate} createLabel={createLabel} />
    </div>
  );
  const createCompany = (name: string) => {
    const co = state.add("companies", { name, industry: "", website: "", phone: "", city: "", country: "", employees: "", ownerId: me });
    toast.success("Company created", name);
    return co.id;
  };
  const opts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));
  const users = (filter?: (r: string) => boolean) => state.users.filter((u) => !filter || filter(u.role)).map((u) => ({ value: u.id, label: u.name }));
  const companyName = new Map(state.companies.map((c) => [c.id, c.name]));
  const companies = [...state.companies]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ value: c.id, label: c.name, hint: [c.industry, c.city].filter(Boolean).join(" · ") }));
  const contacts = state.contacts
    .filter((c) => !values.companyId || c.companyId === values.companyId)
    .map((c) => ({ value: c.id, label: contactName(c), hint: [c.email, companyName.get(c.companyId ?? "")].filter(Boolean).join(" · ") }));
  const deals = state.deals
    .filter((d) => !values.companyId || d.companyId === values.companyId)
    .map((d) => ({ value: d.id, label: d.name, hint: companyName.get(d.companyId ?? "") }));

  const relations = (withDeal: boolean) => (
    <>
      {search("companyId", "Company", companies, "No company", createCompany, "Create company")}
      {search("contactId", "Contact", contacts, "No contact")}
      {withDeal && search("dealId", "Deal", deals, "No deal")}
    </>
  );

  // While naming a new company, show existing ones with a similar name.
  const nameQuery = kind === "company" ? (values.name ?? "").trim().toLowerCase() : "";
  const similar =
    nameQuery.length >= 2
      ? state.companies.filter((c) => c.id !== existing?.id && (c.name.toLowerCase().includes(nameQuery) || c.website.toLowerCase().includes(nameQuery))).slice(0, 4)
      : [];

  let body: React.ReactNode;
  switch (kind) {
    case "contact":
      body = (
        <>
          {text("firstName", "First name", { autoFocus: true, placeholder: "Amit" }, true)}
          {text("lastName", "Last name", { placeholder: "Sharma" }, true)}
          {text("email", "Email", { type: "email", placeholder: "amit@company.com" }, true)}
          {text("phone", "Phone", { placeholder: "+91 98765 43210" })}
          {text("title", "Job title", { placeholder: "Head of Procurement" })}
          {search("companyId", "Company", companies, "No company", createCompany, "Create company")}
          {select("status", "Status", opts(CONTACT_STATUSES))}
          {select("source", "Lead source", opts(LEAD_SOURCES))}
          {select("ownerId", "Owner", users())}
        </>
      );
      break;
    case "company":
      body = (
        <>
          <div className="flex flex-col gap-2 sm:col-span-2">
            {text("name", "Company name", { autoFocus: true, placeholder: "Start typing to check existing companies…" }, true)}
            {similar.length > 0 && (
              <div className="rounded-lg border border-line bg-surface-2/60 p-2 text-[13px]">
                <p className="px-1 pb-1 text-xs font-medium text-muted">Already in your CRM</p>
                {similar.map((c) => (
                  <Link key={c.id} href={`/companies/${c.id}`} onClick={onClose} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-fg-2 hover:bg-surface hover:text-primary">
                    <Building2 className="h-3.5 w-3.5 text-subtle" />
                    <span className="font-medium">{c.name}</span>
                    <span className="truncate text-xs text-muted">{[c.website, c.city].filter(Boolean).join(" · ")}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {select("industry", "Industry", opts(INDUSTRIES))}
          {select("employees", "Employees", opts(EMPLOYEE_RANGES))}
          {text("website", "Website", { placeholder: "www.company.com" })}
          {text("phone", "Phone")}
          {text("city", "City", { placeholder: "Hyderabad" })}
          {text("country", "Country")}
          {select("ownerId", "Account owner", users())}
        </>
      );
      break;
    case "deal":
      body = (
        <>
          <div className="sm:col-span-2">{text("name", "Deal name", { autoFocus: true, placeholder: "Website Redesign" }, true)}</div>
          {text("amount", `Amount (${state.settings.currency === "INR" ? "₹" : "$"})`, { type: "number", min: 0, step: 1000, placeholder: "250000" }, true)}
          {text("closeDate", "Expected close date", { type: "date" }, true)}
          {select("stage", "Stage", STAGES.map((s) => ({ value: s.id, label: s.label })))}
          {text("probability", "Probability (%)", { type: "number", min: 0, max: 100 })}
          {relations(false)}
          {select("priority", "Priority", opts(PRIORITIES))}
          {select("ownerId", "Owner", users())}
        </>
      );
      break;
    case "task":
      body = (
        <>
          <div className="sm:col-span-2">{text("title", "Title", { autoFocus: true, placeholder: "Send revised proposal" }, true)}</div>
          {text("dueDate", "Due date", { type: "date" }, true)}
          {select("priority", "Priority", opts(PRIORITIES))}
          {select("assigneeId", "Assignee", users())}
          {select("status", "Status", [{ value: "todo", label: "To do" }, { value: "done", label: "Completed" }])}
          {relations(true)}
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional details…" />
          </Field>
        </>
      );
      break;
    case "activity":
      body = (
        <>
          <div className="sm:col-span-2">
            <Segmented options={ACTIVITY_TYPES.map((a) => ({ id: a.id, label: a.label }))} value={values.type as never} onChange={(v) => set("type", v)} className="flex w-full [&>button]:flex-1 [&>button]:justify-center" />
          </div>
          <div className="sm:col-span-2">{text("subject", "Subject", { autoFocus: true, placeholder: "Discovery call" }, true)}</div>
          {text("date", "Date & time", { type: "datetime-local" }, true)}
          {select("status", "Status", [{ value: "completed", label: "Completed" }, { value: "planned", label: "Planned" }])}
          {relations(true)}
          {select("ownerId", "Owner", users())}
          <Field label="Description" className="sm:col-span-2">
            <Textarea value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="What happened / what's planned?" />
          </Field>
        </>
      );
      break;
    case "ticket":
      body = (
        <>
          <div className="sm:col-span-2">{text("subject", "Subject", { autoFocus: true, placeholder: "Unable to login to portal" }, true)}</div>
          {relations(false)}
          {select("priority", "Priority", opts(TICKET_PRIORITIES))}
          {select("status", "Status", opts(TICKET_STATUSES))}
          {select("assigneeId", "Assignee", users())}
          <Field label="Description" className="sm:col-span-2">
            <Textarea value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the issue…" />
          </Field>
        </>
      );
      break;
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && save();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`${existing ? "Edit" : "New"} ${LABEL[kind].toLowerCase()}`}
      description={existing ? "Update the details below." : "Fill in the details below. Fields marked * are required."}
      size={kind === "activity" || kind === "task" ? "md" : "md"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving}>
            {existing ? "Save changes" : `Create ${LABEL[kind].toLowerCase()}`}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {body}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
