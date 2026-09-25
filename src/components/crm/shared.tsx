"use client";

import {
  CalendarClock,
  Check,
  FileText,
  GitCommitHorizontal,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Repeat,
  Tag,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ACTIVITY_MAP, CONTACT_STATUS_TONE, PRIORITY_TONE, STAGE_MAP, TICKET_STATUS_TONE } from "@/lib/constants";
import { contactName, useLookup } from "@/lib/hooks";
import { useCRM, type CollectionKey } from "@/lib/store";
import type { Activity, ActivityType, ContactStatus, DealStage, EntityKind, Priority, Relations, Task, TicketPriority, TicketStatus } from "@/lib/types";
import { confirmDialog, openForm, toast } from "@/lib/ui-store";
import { cn, DAY, dayLabel, formatDateTime, relativeTime, startOfDay } from "@/lib/utils";
import { Menu } from "../ui/overlay";
import { Avatar, Badge, Button, Checkbox, EmptyState } from "../ui/primitives";

/* ---------------- Badges ---------------- */
export const StageBadge = ({ stage }: { stage: DealStage }) => <Badge tone={STAGE_MAP[stage].tone} dot>{STAGE_MAP[stage].label}</Badge>;
export const ContactStatusBadge = ({ status }: { status: ContactStatus }) => <Badge tone={CONTACT_STATUS_TONE[status]} dot>{status}</Badge>;
export const PriorityBadge = ({ priority }: { priority: Priority | TicketPriority }) => <Badge tone={PRIORITY_TONE[priority]}>{priority}</Badge>;
export const TicketStatusBadge = ({ status }: { status: TicketStatus }) => <Badge tone={TICKET_STATUS_TONE[status]} dot>{status}</Badge>;

export const ACTIVITY_ICON: Record<ActivityType, LucideIcon> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: FileText,
  "follow-up": Repeat,
};

export function ActivityIcon({ type, className }: { type: ActivityType; className?: string }) {
  const Icon = ACTIVITY_ICON[type];
  return (
    <span className={cn(`tone-${ACTIVITY_MAP[type].tone}`, "flex h-8 w-8 shrink-0 items-center justify-center rounded-full", className)}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

/* ---------------- Owner cell ---------------- */
export function OwnerCell({ userId, compact }: { userId: string; compact?: boolean }) {
  const user = useCRM((s) => s.users.find((u) => u.id === userId));
  if (!user) return <span className="text-subtle">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar name={user.name} color={user.color} size={compact ? 22 : 26} />
      {!compact && <span className="text-fg-2">{user.name}</span>}
    </span>
  );
}

/* ---------------- Links ---------------- */
export function CompanyLink({ id, className }: { id: string | null; className?: string }) {
  const c = useCRM((s) => (id ? s.companies.find((x) => x.id === id) : undefined));
  if (!c) return <span className="text-subtle">—</span>;
  return (
    <Link href={`/companies/${c.id}`} onClick={(e) => e.stopPropagation()} className={cn("text-fg-2 hover:text-primary hover:underline", className)}>
      {c.name}
    </Link>
  );
}

export function ContactLink({ id, className }: { id: string | null; className?: string }) {
  const c = useCRM((s) => (id ? s.contacts.find((x) => x.id === id) : undefined));
  if (!c) return <span className="text-subtle">—</span>;
  return (
    <Link href={`/contacts/${c.id}`} onClick={(e) => e.stopPropagation()} className={cn("text-fg-2 hover:text-primary hover:underline", className)}>
      {contactName(c)}
    </Link>
  );
}

/* ---------------- Delete helper ---------------- */
const KIND_KEY: Record<EntityKind, CollectionKey> = { contact: "contacts", company: "companies", deal: "deals", task: "tasks", activity: "activities", ticket: "tickets" };

export async function deleteRecord(kind: EntityKind, ids: string | string[], name: string, after?: () => void) {
  const n = Array.isArray(ids) ? ids.length : 1;
  const ok = await confirmDialog({
    title: n > 1 ? `Delete ${n} ${kind === "company" ? "companies" : kind + "s"}?` : `Delete ${kind}?`,
    message: n > 1 ? "These records will be permanently removed. Related records will be unlinked." : `"${name}" will be permanently removed. Related records will be unlinked.`,
  });
  if (!ok) return false;
  useCRM.getState().remove(KIND_KEY[kind], ids);
  toast.success(n > 1 ? `${n} records deleted` : `${kind[0]!.toUpperCase() + kind.slice(1)} deleted`);
  after?.();
  return true;
}

export function RowActions({ kind, id, name, extra = [] }: { kind: EntityKind; id: string; name: string; extra?: { label: string; icon: LucideIcon; onSelect: () => void }[] }) {
  return (
    <Menu
      width="w-44"
      trigger={(p) => <Button {...p} variant="ghost" size="icon-sm" icon={MoreHorizontal} aria-label="Actions" className="opacity-60 group-hover:opacity-100" />}
      items={[
        ...extra,
        { label: "Edit", icon: Pencil, onSelect: () => openForm(kind, { id }) },
        "divider",
        { label: "Delete", icon: Trash2, danger: true, onSelect: () => deleteRecord(kind, id, name) },
      ]}
    />
  );
}

/* ---------------- Task row ---------------- */
export function dueState(task: Task) {
  if (task.status === "done") return "done" as const;
  const d = startOfDay(task.dueDate).getTime();
  const t = startOfDay().getTime();
  return d < t ? ("overdue" as const) : d === t ? ("today" as const) : d < t + 7 * DAY ? ("soon" as const) : ("later" as const);
}

export function TaskRow({ task, showAssignee = true, compact }: { task: Task; showAssignee?: boolean; compact?: boolean }) {
  const toggleTask = useCRM((s) => s.toggleTask);
  const lookup = useLookup();
  const router = useRouter();
  const state = dueState(task);
  const related = task.dealId ? lookup.deals.get(task.dealId)?.name : task.companyId ? lookup.companies.get(task.companyId)?.name : null;
  return (
    <div className={cn("group flex items-center gap-3 transition-colors", compact ? "py-2.5" : "px-4 py-3 hover:bg-surface-2/60")}>
      <Checkbox
        label="Complete task"
        checked={task.status === "done"}
        onChange={() => {
          toggleTask(task.id);
          if (task.status !== "done") toast.success("Task completed", task.title);
        }}
        className="rounded-full"
      />
      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => {
          const action = /^call\b/i.test(task.title) ? "call" : /^e-?mail\b/i.test(task.title) ? "email" : /schedule|follow.?up/i.test(task.title) ? "task" : null;
          if (task.contactId && action) router.push(`/contacts/${task.contactId}?action=${action}`);
          else openForm("task", { id: task.id });
        }}
      >
        <p className={cn("truncate text-sm font-medium", task.status === "done" ? "text-subtle line-through" : "text-fg")}>{task.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
          <span className={cn(state === "overdue" && "font-medium text-tone-red", state === "today" && "font-medium text-tone-amber")}>
            {state === "overdue" ? `Overdue · ${dayLabel(task.dueDate)}` : dayLabel(task.dueDate)}
          </span>
          {related && <><span>·</span><span className="truncate">{related}</span></>}
        </p>
      </button>
      {!compact && <PriorityBadge priority={task.priority} />}
      {compact && task.priority === "High" && task.status !== "done" && <Badge tone="red">High</Badge>}
      {showAssignee && <OwnerCell userId={task.assigneeId} compact />}
      {!compact && <RowActions kind="task" id={task.id} name={task.title} />}
    </div>
  );
}

/* ---------------- Activity item ---------------- */
export function ActivityItem({ activity, showRelations = true }: { activity: Activity; showRelations?: boolean }) {
  const update = useCRM((s) => s.update);
  const lookup = useLookup();
  const contact = activity.contactId ? lookup.contacts.get(activity.contactId) : undefined;
  const company = activity.companyId ? lookup.companies.get(activity.companyId) : undefined;
  const deal = activity.dealId ? lookup.deals.get(activity.dealId) : undefined;
  const owner = lookup.users.get(activity.ownerId);
  return (
    <div className="group flex gap-3">
      <ActivityIcon type={activity.type} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">{activity.subject}</p>
            {showRelations && (contact || company || deal) && (
              <p className="mt-0.5 truncate text-xs text-muted">
                {[contact && contactName(contact), company?.name, deal?.name].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
      <div className="flex shrink-0 self-end items-center gap-1 pb-0.5">
            {activity.status === "planned" ? (
              <Button
                size="sm"
                variant="soft"
                icon={Check}
                className="h-7"
                onClick={() => {
                  update("activities", activity.id, { status: "completed" });
                  toast.success("Activity marked as done");
                }}
              >
                Done
              </Button>
            ) : null}
            <RowActions kind="activity" id={activity.id} name={activity.subject} />
          </div>
        </div>
        {activity.description && <p className="mt-1 line-clamp-2 text-[13px] text-fg-2">{activity.description}</p>}
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-subtle">
          <CalendarClock className="h-3 w-3" />
          {formatDateTime(activity.date)}
          {owner && <> · {owner.name}</>}
          {activity.status === "planned" && <Badge tone="amber" className="ml-1 py-0">Planned</Badge>}
        </p>
      </div>
    </div>
  );
}

/* ---------------- Timeline (activities + system events) ---------------- */
export function Timeline({ rel, limit }: { rel: Relations; limit?: number }) {
  const activities = useCRM((s) => s.activities);
  const events = useCRM((s) => s.events);
  const users = useCRM((s) => s.users);
  const items = useMemo(() => {
    const match = (r: Relations) =>
      (rel.contactId && r.contactId === rel.contactId) ||
      (rel.companyId && r.companyId === rel.companyId) ||
      (rel.dealId && r.dealId === rel.dealId) ||
      (rel.ticketId && r.ticketId === rel.ticketId);
    const list = [
      ...activities.filter(match).map((a) => ({ kind: "activity" as const, at: a.date, a })),
      ...events.filter(match).map((e) => ({ kind: "event" as const, at: e.at, e })),
    ].sort((x, y) => y.at.localeCompare(x.at));
    return limit ? list.slice(0, limit) : list;
  }, [activities, events, rel.contactId, rel.companyId, rel.dealId, rel.ticketId, limit]);

  if (!items.length) return <EmptyState icon={GitCommitHorizontal} title="No history yet" description="Activities, notes and changes will appear here." />;

  return (
    <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-line">
      {items.map((it) =>
        it.kind === "activity" ? (
          <li key={it.a.id} className="relative">
            <ActivityItem activity={it.a} />
          </li>
        ) : (
          <li key={it.e.id} className="relative flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-surface bg-line-strong ring-4 ring-surface" />
            </span>
            <div className="pt-1.5 text-[13px]">
              <span className="text-fg-2">{it.e.text}</span>
              <span className="text-subtle"> · {users.find((u) => u.id === it.e.userId)?.name ?? "System"} · {relativeTime(it.e.at)}</span>
            </div>
          </li>
        ),
      )}
    </ol>
  );
}

/* ---------------- Detail helpers ---------------- */
export function InfoRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <div className="mt-0.5 truncate text-sm text-fg">{children}</div>
      </div>
    </div>
  );
}

export function StatBox({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/50 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-fg">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function QuickAction({ icon: Icon, label, onClick, href }: { icon: LucideIcon; label: string; onClick?: () => void; href?: string }) {
  const cls = "flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs font-medium text-fg-2 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-card min-w-[72px]";
  const inner = (
    <>
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </>
  );
  return href ? <a href={href} onClick={onClick} className={cls}>{inner}</a> : <button onClick={onClick} className={cls}>{inner}</button>;
}

/** Additional properties carried over from imported CSV files. */
export function ExtraFields({ extra, className }: { extra?: Record<string, string>; className?: string }) {
  const entries = Object.entries(extra ?? {}).filter(([, v]) => v);
  if (!entries.length) return null;
  return (
    <div className={cn("divide-y divide-line", className)}>
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-start gap-3 py-2">
          <Tag className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">{k}</p>
            <p className="mt-0.5 text-sm break-words text-fg">{v}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
