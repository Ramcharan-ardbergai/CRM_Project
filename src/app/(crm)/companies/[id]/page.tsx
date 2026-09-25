"use client";

import { ArrowLeft, Building2, CalendarDays, ChevronRight, FileText, Globe, Handshake, LifeBuoy, MapPin, MoreHorizontal, Pencil, Phone, Trash2, User, UserPlus, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { NoteComposer } from "@/components/crm/NoteComposer";
import { ActivityItem, ContactStatusBadge, ExtraFields, deleteRecord, InfoRow, OwnerCell, QuickAction, StageBadge, StatBox, TicketStatusBadge, Timeline } from "@/components/crm/shared";
import { Menu } from "@/components/ui/overlay";
import { Avatar, Button, Card, CardHeader, CompanyAvatar, EmptyState, Tabs } from "@/components/ui/primitives";
import { OPEN_TICKET_STATUSES } from "@/lib/constants";
import { contactName, useMoney } from "@/lib/hooks";
import { isOpen } from "@/lib/metrics";
import { useCRM } from "@/lib/store";
import { openDeal, openForm } from "@/lib/ui-store";
import { formatDate, relativeTime } from "@/lib/utils";

type Tab = "timeline" | "contacts" | "deals" | "activities" | "tickets" | "notes";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const money = useMoney();
  const company = useCRM((s) => s.companies.find((c) => c.id === id));
  const allContacts = useCRM((s) => s.contacts);
  const allDeals = useCRM((s) => s.deals);
  const allActivities = useCRM((s) => s.activities);
  const allTickets = useCRM((s) => s.tickets);
  const [tab, setTab] = useState<Tab>("timeline");

  const contacts = useMemo(() => allContacts.filter((c) => c.companyId === id), [allContacts, id]);
  const deals = useMemo(() => allDeals.filter((d) => d.companyId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [allDeals, id]);
  const activities = useMemo(() => allActivities.filter((a) => a.companyId === id).sort((a, b) => b.date.localeCompare(a.date)), [allActivities, id]);
  const tickets = useMemo(() => allTickets.filter((t) => t.companyId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [allTickets, id]);

  if (!company) {
    return <EmptyState icon={Building2} title="Company not found" description="It may have been deleted." action={<Button onClick={() => router.push("/companies")}>Back to companies</Button>} />;
  }

  const rel = { companyId: company.id };
  const notes = activities.filter((a) => a.type === "note");
  const lastDone = activities.find((a) => a.status === "completed");
  const chain = [
    { label: "Contacts", count: contacts.length, icon: Users, tab: "contacts" as Tab },
    { label: "Deals", count: deals.length, icon: Handshake, tab: "deals" as Tab },
    { label: "Activities", count: activities.length, icon: Zap, tab: "activities" as Tab },
    { label: "Tickets", count: tickets.length, icon: LifeBuoy, tab: "tickets" as Tab },
  ];

  return (
    <div className="space-y-6">
      <Link href="/companies" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Companies
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <CompanyAvatar name={company.name} size={64} className="rounded-2xl text-2xl" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-fg">{company.name}</h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                {company.industry && <span>{company.industry}</span>}
                {company.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{company.city}</span>}
                {company.website && <a href={`https://${company.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary"><Globe className="h-3.5 w-3.5" />{company.website}</a>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <QuickAction icon={UserPlus} label="Contact" onClick={() => openForm("contact", { defaults: rel })} />
            <QuickAction icon={Handshake} label="Deal" onClick={() => openForm("deal", { defaults: rel })} />
            <QuickAction icon={Zap} label="Activity" onClick={() => openForm("activity", { defaults: rel })} />
            <QuickAction icon={LifeBuoy} label="Ticket" onClick={() => openForm("ticket", { defaults: rel })} />
            <QuickAction icon={FileText} label="Note" onClick={() => setTab("notes")} />
            <Menu
              trigger={(p) => <Button {...p} size="icon" icon={MoreHorizontal} aria-label="More" />}
              items={[
                { label: "Edit company", icon: Pencil, onSelect: () => openForm("company", { id: company.id }) },
                "divider",
                { label: "Delete company", icon: Trash2, danger: true, onSelect: () => deleteRecord("company", company.id, company.name, () => router.push("/companies")) },
              ]}
            />
          </div>
        </div>

        {/* Relationship chain */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
          <span className="rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium text-fg">{company.name}</span>
          {chain.map((c) => (
            <Fragment key={c.label}>
              <ChevronRight className="h-4 w-4 text-subtle" />
              <button onClick={() => setTab(c.tab)} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:text-primary">
                <c.icon className="h-4 w-4 text-muted" />
                <span className="font-semibold text-fg">{c.count}</span>
                <span className="text-muted">{c.label}</span>
              </button>
            </Fragment>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="self-start xl:col-span-4">
          <CardHeader title="About" action={<Button size="sm" variant="ghost" icon={Pencil} onClick={() => openForm("company", { id: company.id })}>Edit</Button>} />
          <div className="divide-y divide-line px-5 pb-3">
            <InfoRow icon={Building2} label="Industry">{company.industry || "—"}</InfoRow>
            <InfoRow icon={Users} label="Employees">{company.employees || "—"}</InfoRow>
            <InfoRow icon={Phone} label="Phone">{company.phone || "—"}</InfoRow>
            <InfoRow icon={MapPin} label="Location">{[company.city, company.country].filter(Boolean).join(", ") || "—"}</InfoRow>
            <InfoRow icon={User} label="Account owner"><OwnerCell userId={company.ownerId} /></InfoRow>
            <InfoRow icon={CalendarDays} label="Added">{formatDate(company.createdAt)}</InfoRow>
            <ExtraFields extra={company.extra} />
          </div>
        </Card>

        <div className="space-y-6 xl:col-span-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBox label="Open pipeline" value={money.compact(deals.filter(isOpen).reduce((s, d) => s + d.amount, 0))} hint={`${deals.filter(isOpen).length} open deals`} />
            <StatBox label="Won revenue" value={money.compact(deals.filter((d) => d.stage === "won").reduce((s, d) => s + d.amount, 0))} hint={`${deals.filter((d) => d.stage === "won").length} deals won`} />
            <StatBox label="Open tickets" value={tickets.filter((t) => OPEN_TICKET_STATUSES.includes(t.status)).length} />
            <StatBox label="Last activity" value={lastDone ? relativeTime(lastDone.date) : "Never"} />
          </div>

          <Card>
            <Tabs
              className="px-3"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "timeline", label: "Timeline" },
                { id: "contacts", label: "Contacts", count: contacts.length },
                { id: "deals", label: "Deals", count: deals.length },
                { id: "activities", label: "Activities", count: activities.length },
                { id: "tickets", label: "Tickets", count: tickets.length },
                { id: "notes", label: "Notes", count: notes.length },
              ]}
            />
            <div className="p-5">
              {tab === "timeline" && <Timeline rel={rel} />}
              {tab === "contacts" &&
                (contacts.length ? (
                  <div className="divide-y divide-line">
                    {contacts.map((c) => (
                      <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                        <Avatar name={contactName(c)} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-fg">{contactName(c)}</p>
                          <p className="text-xs text-muted">{[c.title, c.email].filter(Boolean).join(" · ") || "—"}</p>
                        </div>
                        <ContactStatusBadge status={c.status} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Users} title="No contacts" action={<Button size="sm" variant="primary" onClick={() => openForm("contact", { defaults: rel })}>Add contact</Button>} />
                ))}
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
                  <EmptyState icon={Handshake} title="No deals" action={<Button size="sm" variant="primary" onClick={() => openForm("deal", { defaults: rel })}>Create deal</Button>} />
                ))}
              {tab === "activities" &&
                (activities.length ? (
                  <div className="space-y-5">{activities.map((a) => <ActivityItem key={a.id} activity={a} />)}</div>
                ) : (
                  <EmptyState icon={Zap} title="No activities" action={<Button size="sm" variant="primary" onClick={() => openForm("activity", { defaults: rel })}>Log activity</Button>} />
                ))}
              {tab === "tickets" &&
                (tickets.length ? (
                  <div className="divide-y divide-line">
                    {tickets.map((t) => (
                      <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                        <span className="w-14 text-xs font-medium text-muted">#{t.number}</span>
                        <p className="min-w-0 flex-1 truncate font-medium text-fg">{t.subject}</p>
                        <TicketStatusBadge status={t.status} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={LifeBuoy} title="No tickets" description="This account has no support requests." />
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
