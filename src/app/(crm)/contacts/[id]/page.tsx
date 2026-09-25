"use client";

import { ArrowLeft, Building2, CalendarDays, CheckSquare, FileText, Globe, Handshake, Mail, MoreHorizontal, Pencil, Phone, Trash2, User, UserX } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NoteComposer } from "@/components/crm/NoteComposer";
import { ActivityItem, CompanyLink, ExtraFields, ContactStatusBadge, deleteRecord, InfoRow, OwnerCell, QuickAction, StageBadge, StatBox, TaskRow, Timeline } from "@/components/crm/shared";
import { Menu } from "@/components/ui/overlay";
import { Avatar, Button, Card, CardHeader, CompanyAvatar, EmptyState, Tabs } from "@/components/ui/primitives";
import { contactName, useMoney } from "@/lib/hooks";
import { isOpen } from "@/lib/metrics";
import { useCRM } from "@/lib/store";
import { openDeal, openForm } from "@/lib/ui-store";
import { formatDate, relativeTime } from "@/lib/utils";

type Tab = "overview" | "deals" | "activities" | "tasks" | "notes";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const money = useMoney();
  const contact = useCRM((s) => s.contacts.find((c) => c.id === id));
  const company = useCRM((s) => s.companies.find((c) => c.id === contact?.companyId));
  const allDeals = useCRM((s) => s.deals);
  const allActivities = useCRM((s) => s.activities);
  const allTasks = useCRM((s) => s.tasks);
  const [tab, setTab] = useState<Tab>("overview");

  const deals = useMemo(() => allDeals.filter((d) => d.contactId === id), [allDeals, id]);
  const activities = useMemo(() => allActivities.filter((a) => a.contactId === id).sort((a, b) => b.date.localeCompare(a.date)), [allActivities, id]);
  const tasks = useMemo(() => allTasks.filter((t) => t.contactId === id).sort((a, b) => a.status.localeCompare(b.status) || a.dueDate.localeCompare(b.dueDate)), [allTasks, id]);

  if (!contact) {
    return <EmptyState icon={UserX} title="Contact not found" description="It may have been deleted." action={<Button onClick={() => router.push("/contacts")}>Back to contacts</Button>} />;
  }

  const name = contactName(contact);
  const rel = { contactId: contact.id, companyId: contact.companyId };
  const notes = activities.filter((a) => a.type === "note");
  const lastActivity = activities.find((a) => a.status === "completed");

  return (
    <div className="space-y-6">
      <Link href="/contacts" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Contacts
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={name} size={64} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-fg">{name}</h1>
                <ContactStatusBadge status={contact.status} />
              </div>
              <p className="mt-0.5 text-sm text-muted">
                {contact.title || (company ? "Works" : "No company")}
                {company && <> at <CompanyLink id={company.id} className="font-medium" /></>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <QuickAction icon={Phone} label="Call" onClick={() => openForm("activity", { defaults: { ...rel, type: "call", subject: `Call with ${name}` } })} />
            <QuickAction icon={Mail} label="Email" href={`mailto:${contact.email}`} onClick={() => openForm("activity", { defaults: { ...rel, type: "email", subject: `Email to ${name}` } })} />
            <QuickAction icon={CheckSquare} label="Task" onClick={() => openForm("task", { defaults: { ...rel, title: `Follow up with ${name}` } })} />
            <QuickAction icon={FileText} label="Note" onClick={() => setTab("notes")} />
            <QuickAction icon={Handshake} label="Deal" onClick={() => openForm("deal", { defaults: rel })} />
            <Menu
              trigger={(p) => <Button {...p} size="icon" icon={MoreHorizontal} aria-label="More" />}
              items={[
                { label: "Edit contact", icon: Pencil, onSelect: () => openForm("contact", { id: contact.id }) },
                "divider",
                { label: "Delete contact", icon: Trash2, danger: true, onSelect: () => deleteRecord("contact", contact.id, name, () => router.push("/contacts")) },
              ]}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-4">
          <Card>
            <CardHeader title="About" action={<Button size="sm" variant="ghost" icon={Pencil} onClick={() => openForm("contact", { id: contact.id })}>Edit</Button>} />
            <div className="divide-y divide-line px-5 pb-3">
              <InfoRow icon={Mail} label="Email">{contact.email ? <a href={`mailto:${contact.email}`} className="hover:text-primary">{contact.email}</a> : "—"}</InfoRow>
              <InfoRow icon={Phone} label="Phone">{contact.phone ? <a href={`tel:${contact.phone}`} className="hover:text-primary">{contact.phone}</a> : "—"}</InfoRow>
              <InfoRow icon={Building2} label="Company"><CompanyLink id={contact.companyId} /></InfoRow>
              <InfoRow icon={User} label="Owner"><OwnerCell userId={contact.ownerId} /></InfoRow>
              <InfoRow icon={Globe} label="Lead source">{contact.source}</InfoRow>
              <InfoRow icon={CalendarDays} label="Created">{formatDate(contact.createdAt)}</InfoRow>
              <ExtraFields extra={contact.extra} />
            </div>
          </Card>
          {company && (
            <Card className="p-5">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">Company</p>
              <Link href={`/companies/${company.id}`} className="group mt-3 flex items-center gap-3">
                <CompanyAvatar name={company.name} size={44} />
                <div>
                  <p className="font-semibold text-fg group-hover:text-primary">{company.name}</p>
                  <p className="text-xs text-muted">{[company.industry, company.city, company.website].filter(Boolean).join(" · ")}</p>
                </div>
              </Link>
            </Card>
          )}
        </div>

        <div className="space-y-6 xl:col-span-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBox label="Open pipeline" value={money.compact(deals.filter(isOpen).reduce((s, d) => s + d.amount, 0))} hint={`${deals.filter(isOpen).length} deals`} />
            <StatBox label="Won revenue" value={money.compact(deals.filter((d) => d.stage === "won").reduce((s, d) => s + d.amount, 0))} />
            <StatBox label="Open tasks" value={tasks.filter((t) => t.status === "todo").length} />
            <StatBox label="Last contacted" value={lastActivity ? relativeTime(lastActivity.date) : "Never"} />
          </div>

          <Card>
            <Tabs
              className="px-3"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "overview", label: "Timeline" },
                { id: "deals", label: "Deals", count: deals.length },
                { id: "activities", label: "Activities", count: activities.length },
                { id: "tasks", label: "Tasks", count: tasks.filter((t) => t.status === "todo").length },
                { id: "notes", label: "Notes", count: notes.length },
              ]}
            />
            <div className="p-5">
              {tab === "overview" && <Timeline rel={{ contactId: contact.id }} />}
              {tab === "deals" &&
                (deals.length ? (
                  <div className="divide-y divide-line">
                    {deals.map((d) => (
                      <button key={d.id} onClick={() => openDeal(d.id)} className="flex w-full items-center gap-3 py-3 text-left hover:opacity-80">
                        <span className="tone-blue flex h-9 w-9 items-center justify-center rounded-lg"><Handshake className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-fg">{d.name}</p>
                          <p className="text-xs text-muted">Close {formatDate(d.closeDate)}</p>
                        </div>
                        <StageBadge stage={d.stage} />
                        <span className="w-24 text-right font-semibold text-fg">{money.compact(d.amount)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Handshake} title="No deals yet" action={<Button size="sm" variant="primary" onClick={() => openForm("deal", { defaults: rel })}>Create deal</Button>} />
                ))}
              {tab === "activities" &&
                (activities.length ? (
                  <div className="space-y-5">{activities.map((a) => <ActivityItem key={a.id} activity={a} showRelations={false} />)}</div>
                ) : (
                  <EmptyState icon={Phone} title="No activities yet" action={<Button size="sm" variant="primary" onClick={() => openForm("activity", { defaults: rel })}>Log activity</Button>} />
                ))}
              {tab === "tasks" &&
                (tasks.length ? (
                  <div className="divide-y divide-line">{tasks.map((t) => <TaskRow key={t.id} task={t} compact />)}</div>
                ) : (
                  <EmptyState icon={CheckSquare} title="No tasks yet" action={<Button size="sm" variant="primary" onClick={() => openForm("task", { defaults: rel })}>Create task</Button>} />
                ))}
              {tab === "notes" && (
                <div className="space-y-5">
                  <NoteComposer rel={rel} />
                  {notes.map((a) => <ActivityItem key={a.id} activity={a} showRelations={false} />)}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
