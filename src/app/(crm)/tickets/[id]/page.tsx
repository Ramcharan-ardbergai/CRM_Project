"use client";

import { ArrowLeft, Building2, Clock, LifeBuoy, Mail, Pencil, Trash2, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { NoteComposer } from "@/components/crm/NoteComposer";
import { CompanyLink, ContactLink, deleteRecord, ExtraFields, InfoRow, PriorityBadge, TicketStatusBadge, Timeline } from "@/components/crm/shared";
import { Avatar, Button, Card, CardHeader, EmptyState, Field, Select } from "@/components/ui/primitives";
import { TICKET_PRIORITIES, TICKET_STATUSES, TICKET_STATUS_TONE } from "@/lib/constants";
import { contactName } from "@/lib/hooks";
import { useCRM } from "@/lib/store";
import type { TicketPriority, TicketStatus } from "@/lib/types";
import { openForm, toast } from "@/lib/ui-store";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const ticket = useCRM((s) => s.tickets.find((t) => t.id === id));
  const contact = useCRM((s) => s.contacts.find((c) => c.id === ticket?.contactId));
  const users = useCRM((s) => s.users);
  const update = useCRM((s) => s.update);
  const setTicketStatus = useCRM((s) => s.setTicketStatus);

  if (!ticket) {
    return <EmptyState icon={LifeBuoy} title="Ticket not found" action={<Button onClick={() => router.push("/tickets")}>Back to tickets</Button>} />;
  }

  const setStatus = (s: TicketStatus) => {
    setTicketStatus(ticket.id, s);
    toast.success(`Ticket ${s.toLowerCase()}`, `#${ticket.number}`);
  };
  const statusIdx = TICKET_STATUSES.indexOf(ticket.status);

  return (
    <div className="space-y-6">
      <Link href="/tickets" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Tickets
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted">#{ticket.number}</span>
              <TicketStatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">{ticket.subject}</h1>
            <p className="mt-1 text-sm text-muted">Opened {relativeTime(ticket.createdAt)} · Updated {relativeTime(ticket.updatedAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ticket.status !== "Resolved" && ticket.status !== "Closed" ? (
              <Button variant="primary" onClick={() => setStatus("Resolved")}>Resolve ticket</Button>
            ) : (
              <Button onClick={() => setStatus("Open")}>Reopen</Button>
            )}
            <Button size="icon" icon={Pencil} onClick={() => openForm("ticket", { id: ticket.id })} aria-label="Edit ticket" />
            <Button size="icon" icon={Trash2} onClick={() => deleteRecord("ticket", ticket.id, ticket.subject, () => router.push("/tickets"))} aria-label="Delete ticket" />
          </div>
        </div>
        {/* Status progress */}
        <div className="mt-6 grid grid-cols-5 gap-1.5">
          {TICKET_STATUSES.map((s, i) => (
            <button key={s} onClick={() => setStatus(s)} className="group text-left" title={`Set ${s}`}>
              <span className={cn("block h-1.5 rounded-full transition-colors", i <= statusIdx ? `tone-${TICKET_STATUS_TONE[ticket.status]}` : "bg-surface-3 group-hover:bg-line-strong")} style={i <= statusIdx ? { background: "currentColor" } : undefined} />
              <span className={cn("mt-1.5 block truncate text-[11px] font-medium", s === ticket.status ? "text-fg" : "text-subtle group-hover:text-fg-2")}>{s}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <Card>
            <CardHeader title="Description" />
            <p className="px-5 pb-5 text-sm leading-relaxed whitespace-pre-wrap text-fg-2">{ticket.description || "No description provided."}</p>
          </Card>
          <Card>
            <CardHeader title="Activity" subtitle="Replies, internal notes and status changes" />
            <div className="space-y-6 px-5 pb-5">
              <NoteComposer rel={{ ticketId: ticket.id, contactId: ticket.contactId, companyId: ticket.companyId }} subject="Internal note" placeholder="Add an internal note or log your reply…" cta="Post" />
              <Timeline rel={{ ticketId: ticket.id }} />
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <Card>
            <CardHeader title="Details" />
            <div className="space-y-4 px-5 pb-5">
              <Field label="Status">
                <Select value={ticket.status} onChange={(e) => setStatus(e.target.value as TicketStatus)}>
                  {TICKET_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Priority">
                <Select value={ticket.priority} onChange={(e) => { update("tickets", ticket.id, { priority: e.target.value as TicketPriority, updatedAt: new Date().toISOString() }); toast.success("Priority updated"); }}>
                  {TICKET_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Assignee">
                <Select value={ticket.assigneeId} onChange={(e) => { update("tickets", ticket.id, { assigneeId: e.target.value, updatedAt: new Date().toISOString() }); toast.success("Ticket reassigned"); }}>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              </Field>
              <div className="divide-y divide-line border-t border-line pt-2">
                <InfoRow icon={Clock} label="Created">{formatDateTime(ticket.createdAt)}</InfoRow>
                <InfoRow icon={Clock} label="Last updated">{formatDateTime(ticket.updatedAt)}</InfoRow>
                {ticket.resolvedAt && <InfoRow icon={Clock} label="Resolved">{formatDateTime(ticket.resolvedAt)}</InfoRow>}
                <ExtraFields extra={ticket.extra} />
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Customer" />
            <div className="px-5 pb-5">
              {contact ? (
                <div className="flex items-center gap-3">
                  <Avatar name={contactName(contact)} size={40} />
                  <div className="min-w-0">
                    <ContactLink id={contact.id} className="font-medium text-fg" />
                    <p className="truncate text-xs text-muted">{contact.title}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">No contact linked.</p>
              )}
              <div className="mt-3 divide-y divide-line">
                {contact?.email && <InfoRow icon={Mail} label="Email"><a href={`mailto:${contact.email}`} className="hover:text-primary">{contact.email}</a></InfoRow>}
                <InfoRow icon={Building2} label="Company"><CompanyLink id={ticket.companyId} /></InfoRow>
                <InfoRow icon={User} label="Account owner">{users.find((u) => u.id === contact?.ownerId)?.name ?? "—"}</InfoRow>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
