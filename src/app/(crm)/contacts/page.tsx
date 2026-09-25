"use client";

import { Download, Search, Tag, Trash2, UserCog, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CompanyLink, ContactStatusBadge, deleteRecord, OwnerCell, RowActions } from "@/components/crm/shared";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Menu } from "@/components/ui/overlay";
import { Avatar, Button, EmptyState, Input, PageHeader, Select, Tabs } from "@/components/ui/primitives";
import { CONTACT_STATUSES } from "@/lib/constants";
import { contactName, useData, useDebounced, useLookup } from "@/lib/hooks";
import { lastActivityByContact } from "@/lib/metrics";
import { useCRM } from "@/lib/store";
import type { Contact, ContactStatus } from "@/lib/types";
import { openForm, toast } from "@/lib/ui-store";
import { downloadCSV, formatDate, relativeTime } from "@/lib/utils";

export default function ContactsPage() {
  const router = useRouter();
  const data = useData();
  const lookup = useLookup();
  const update = useCRM((s) => s.update);
  const [status, setStatus] = useState<"all" | ContactStatus>("all");
  const [owner, setOwner] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [q, setQ] = useState("");
  const query = useDebounced(q).trim().toLowerCase();
  const lastActivity = useMemo(() => lastActivityByContact(data), [data]);

  const rows = useMemo(
    () =>
      data.contacts.filter((c) => {
        if (status !== "all" && c.status !== status) return false;
        if (owner && c.ownerId !== owner) return false;
        if (companyFilter === "none" ? c.companyId : companyFilter && c.companyId !== companyFilter) return false;
        if (!query) return true;
        const company = lookup.companies.get(c.companyId ?? "")?.name ?? "";
        return [contactName(c), c.email, c.phone, company, c.title].some((x) => x.toLowerCase().includes(query));
      }),
    [data.contacts, status, owner, companyFilter, query, lookup],
  );

  const columns: Column<Contact>[] = [
    {
      id: "name",
      header: "Name",
      sortValue: (c) => contactName(c),
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={contactName(c)} size={34} />
          <div>
            <p className="font-medium text-fg group-hover:text-primary">{contactName(c)}</p>
            <p className="text-xs text-muted">{c.title}</p>
          </div>
        </div>
      ),
    },
    { id: "company", header: "Company", hideable: true, sortValue: (c) => lookup.companies.get(c.companyId ?? "")?.name ?? "", cell: (c) => <CompanyLink id={c.companyId} /> },
    { id: "email", header: "Email", hideable: true, sortValue: (c) => c.email, cell: (c) => c.email },
    { id: "phone", header: "Phone", hideable: true, cell: (c) => c.phone || "—" },
    { id: "status", header: "Status", sortValue: (c) => c.status, cell: (c) => <ContactStatusBadge status={c.status} /> },
    { id: "owner", header: "Owner", hideable: true, sortValue: (c) => lookup.users.get(c.ownerId)?.name ?? "", cell: (c) => <OwnerCell userId={c.ownerId} /> },
    {
      id: "last",
      header: "Last Activity",
      hideable: true,
      sortValue: (c) => lastActivity.get(c.id) ?? "",
      cell: (c) => {
        const at = lastActivity.get(c.id);
        return at ? relativeTime(at) : <span className="text-subtle">Never</span>;
      },
    },
    { id: "created", header: "Created", hideable: true, defaultHidden: false, sortValue: (c) => c.createdAt, cell: (c) => formatDate(c.createdAt) },
    { id: "source", header: "Source", hideable: true, defaultHidden: true, sortValue: (c) => c.source, cell: (c) => c.source },
    { id: "actions", header: "", className: "w-10", cell: (c) => <RowActions kind="contact" id={c.id} name={contactName(c)} /> },
  ];

  const count = (s: ContactStatus) => data.contacts.filter((c) => c.status === s).length;

  return (
    <>
      <PageHeader
        title="Contacts"
        description="Everyone you do business with, in one place."
        actions={
          <>
            <Button
              icon={Download}
              onClick={() => {
                downloadCSV("contacts.csv", [
                  ["Name", "Title", "Company", "Email", "Phone", "Status", "Source", "Owner", "Created"],
                  ...rows.map((c) => [contactName(c), c.title, lookup.companies.get(c.companyId ?? "")?.name ?? "", c.email, c.phone, c.status, c.source, lookup.users.get(c.ownerId)?.name ?? "", formatDate(c.createdAt)]),
                ]);
                toast.success("Export ready", `${rows.length} contacts exported to CSV`);
              }}
            >
              Export
            </Button>
            <Button variant="primary" icon={UserPlus} onClick={() => openForm("contact")}>Add contact</Button>
          </>
        }
      />

      <Tabs
        className="mb-4"
        value={status}
        onChange={setStatus}
        tabs={[{ id: "all", label: "All", count: data.contacts.length }, ...CONTACT_STATUSES.map((s) => ({ id: s, label: `${s}s`, count: count(s) }))]}
      />

      <DataTable
        rows={rows}
        columns={columns}
        getId={(c) => c.id}
        onRowClick={(c) => router.push(`/contacts/${c.id}`)}
        initialSort={{ id: "created", dir: "desc" }}
        toolbar={
          <>
            <div className="relative w-full sm:w-72">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, company…" className="pl-9" />
            </div>
            <Select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="w-auto max-w-[220px]" aria-label="Filter by company">
              <option value="">All companies</option>
              <option value="none">No company</option>
              {[...data.companies].sort((a, b) => a.name.localeCompare(b.name)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-auto">
              <option value="">All owners</option>
              {data.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </>
        }
        bulkActions={(ids, clear) => (
          <>
            <Menu
              align="left"
              trigger={(p) => <Button size="sm" icon={Tag} {...p}>Set status</Button>}
              items={CONTACT_STATUSES.map((s) => ({
                label: s,
                onSelect: () => {
                  ids.forEach((id) => update("contacts", id, { status: s }));
                  toast.success(`${ids.length} contacts updated`, `Status set to ${s}`);
                  clear();
                },
              }))}
            />
            <Menu
              align="left"
              trigger={(p) => <Button size="sm" icon={UserCog} {...p}>Assign owner</Button>}
              items={data.users.map((u) => ({
                label: u.name,
                onSelect: () => {
                  ids.forEach((id) => update("contacts", id, { ownerId: u.id }));
                  toast.success(`${ids.length} contacts reassigned`, `Owner set to ${u.name}`);
                  clear();
                },
              }))}
            />
            <Button size="sm" icon={Trash2} className="text-[var(--red)]" onClick={() => deleteRecord("contact", ids, "", clear)}>Delete</Button>
          </>
        )}
        empty={
          data.contacts.length === 0 ? (
            <EmptyState icon={Users} title="No contacts yet" description="Add your first contact to start building relationships." action={<Button variant="primary" icon={UserPlus} onClick={() => openForm("contact")}>Add contact</Button>} />
          ) : undefined
        }
      />
    </>
  );
}
