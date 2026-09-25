"use client";

import { AlertTriangle, CheckCircle2, Clock, Inbox, Plus, Search, Tag, Trash2, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CompanyLink, ContactLink, deleteRecord, OwnerCell, PriorityBadge, RowActions, TicketStatusBadge } from "@/components/crm/shared";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Menu } from "@/components/ui/overlay";
import { Button, Card, IconTile, Input, PageHeader, Select, Tabs } from "@/components/ui/primitives";
import { OPEN_TICKET_STATUSES, TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/constants";
import { useDebounced, useLookup } from "@/lib/hooks";
import { useCRM } from "@/lib/store";
import type { Ticket, TicketStatus } from "@/lib/types";
import { openForm, toast } from "@/lib/ui-store";
import { DAY, formatDate, relativeTime } from "@/lib/utils";

export default function TicketsPage() {
  const router = useRouter();
  const tickets = useCRM((s) => s.tickets);
  const users = useCRM((s) => s.users);
  const setTicketStatus = useCRM((s) => s.setTicketStatus);
  const update = useCRM((s) => s.update);
  const lookup = useLookup();
  const [status, setStatus] = useState<"all" | "open" | TicketStatus>("open");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [q, setQ] = useState("");
  const query = useDebounced(q).trim().toLowerCase();

  const rows = useMemo(
    () =>
      tickets.filter((t) => {
        if (status === "open" && !OPEN_TICKET_STATUSES.includes(t.status)) return false;
        if (status !== "all" && status !== "open" && t.status !== status) return false;
        if (priority && t.priority !== priority) return false;
        if (assignee && t.assigneeId !== assignee) return false;
        if (!query) return true;
        return [t.subject, `#${t.number}`, lookup.companies.get(t.companyId ?? "")?.name ?? ""].some((x) => x.toLowerCase().includes(query));
      }),
    [tickets, status, priority, assignee, query, lookup],
  );

  const open = tickets.filter((t) => OPEN_TICKET_STATUSES.includes(t.status));
  const resolved = tickets.filter((t) => t.resolvedAt);
  const avgHours = resolved.length ? resolved.reduce((s, t) => s + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()), 0) / resolved.length / 3_600_000 : 0;
  const resolvedWeek = tickets.filter(
    (t) => t.status === "Resolved" && t.resolvedAt && Date.now() - new Date(t.resolvedAt).getTime() < 7 * DAY,
  ).length;

  const columns: Column<Ticket>[] = [
    { id: "id", header: "ID", sortValue: (t) => t.number, cell: (t) => <span className="font-medium text-muted">#{t.number}</span> },
    {
      id: "subject",
      header: "Subject",
      sortValue: (t) => t.subject,
      cell: (t) => (
        <div className="max-w-[320px]">
          <p className="truncate font-medium text-fg group-hover:text-primary">{t.subject}</p>
          <p className="truncate text-xs text-muted"><ContactLink id={t.contactId} className="text-muted" /></p>
        </div>
      ),
    },
    { id: "company", header: "Company", hideable: true, sortValue: (t) => lookup.companies.get(t.companyId ?? "")?.name ?? "", cell: (t) => <CompanyLink id={t.companyId} /> },
    { id: "priority", header: "Priority", sortValue: (t) => TICKET_PRIORITIES.indexOf(t.priority), cell: (t) => <PriorityBadge priority={t.priority} /> },
    { id: "status", header: "Status", sortValue: (t) => TICKET_STATUSES.indexOf(t.status), cell: (t) => <TicketStatusBadge status={t.status} /> },
    { id: "assignee", header: "Assignee", hideable: true, sortValue: (t) => lookup.users.get(t.assigneeId)?.name ?? "", cell: (t) => <OwnerCell userId={t.assigneeId} /> },
    { id: "created", header: "Created", hideable: true, sortValue: (t) => t.createdAt, cell: (t) => formatDate(t.createdAt) },
    { id: "updated", header: "Last Updated", hideable: true, sortValue: (t) => t.updatedAt, cell: (t) => relativeTime(t.updatedAt) },
    { id: "actions", header: "", className: "w-10", cell: (t) => <RowActions kind="ticket" id={t.id} name={t.subject} /> },
  ];

  return (
    <>
      <PageHeader title="Tickets" description="Customer support requests linked to your accounts." actions={<Button variant="primary" icon={Plus} onClick={() => openForm("ticket")}>New ticket</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Open tickets", value: open.length, icon: Inbox, tone: "blue" as const },
          { label: "Urgent / High", value: open.filter((t) => t.priority === "Urgent" || t.priority === "High").length, icon: AlertTriangle, tone: "red" as const },
          { label: "Avg resolution", value: avgHours >= 24 ? `${(avgHours / 24).toFixed(1)} days` : `${Math.round(avgHours)} hrs`, icon: Clock, tone: "amber" as const },
          { label: "Resolved (7 days)", value: resolvedWeek, icon: CheckCircle2, tone: "green" as const },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => {
              if (s.label === "Open tickets") { setStatus("open"); setPriority(""); }
              if (s.label === "Urgent / High") { setStatus("all"); setPriority("High"); }
              if (s.label === "Resolved (7 days)") { setStatus("Resolved"); setPriority(""); }
            }}
            className="text-left"
          >
          <Card className="flex items-center gap-3 p-4 transition-all hover:border-line-strong">
            <IconTile icon={s.icon} tone={s.tone} />
            <div>
              <p className="text-xs text-muted">{s.label}</p>
              <p className="text-xl font-semibold text-fg">{s.value}</p>
            </div>
          </Card>
          </button>
        ))}
      </div>

      <Tabs
        className="mb-4"
        value={status}
        onChange={setStatus}
        tabs={[
          { id: "open", label: "Active", count: open.length },
          ...TICKET_STATUSES.map((s) => ({ id: s, label: s, count: tickets.filter((t) => t.status === s).length })),
          { id: "all", label: "All", count: tickets.length },
        ]}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getId={(t) => t.id}
        onRowClick={(t) => router.push(`/tickets/${t.id}`)}
        initialSort={{ id: "updated", dir: "desc" }}
        toolbar={
          <>
            <div className="relative w-full sm:w-64">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tickets…" className="pl-9" />
            </div>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-auto">
              <option value="">Any priority</option>
              {TICKET_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </Select>
            <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-auto">
              <option value="">All assignees</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </>
        }
        bulkActions={(ids, clear) => (
          <>
            <Menu
              align="left"
              trigger={(p) => <Button size="sm" icon={Tag} {...p}>Set status</Button>}
              items={TICKET_STATUSES.map((s) => ({ label: s, onSelect: () => { ids.forEach((id) => setTicketStatus(id, s)); toast.success(`${ids.length} tickets updated`, `Status set to ${s}`); clear(); } }))}
            />
            <Menu
              align="left"
              trigger={(p) => <Button size="sm" icon={UserCog} {...p}>Assign</Button>}
              items={users.map((u) => ({ label: u.name, onSelect: () => { ids.forEach((id) => update("tickets", id, { assigneeId: u.id, updatedAt: new Date().toISOString() })); toast.success(`${ids.length} tickets assigned`, u.name); clear(); } }))}
            />
            <Button size="sm" icon={Trash2} className="text-[var(--red)]" onClick={() => deleteRecord("ticket", ids, "", clear)}>Delete</Button>
          </>
        )}
      />
    </>
  );
}
