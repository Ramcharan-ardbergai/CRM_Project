"use client";

import { Building2, Download, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteRecord, OwnerCell, RowActions } from "@/components/crm/shared";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button, CompanyAvatar, EmptyState, Input, PageHeader, Select } from "@/components/ui/primitives";
import { INDUSTRIES } from "@/lib/constants";
import { useData, useDebounced, useMoney } from "@/lib/hooks";
import { isOpen } from "@/lib/metrics";
import type { Company } from "@/lib/types";
import { openForm, toast } from "@/lib/ui-store";
import { downloadCSV, formatDate } from "@/lib/utils";

export default function CompaniesPage() {
  const router = useRouter();
  const data = useData();
  const money = useMoney();
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("");
  const [owner, setOwner] = useState("");
  const query = useDebounced(q).trim().toLowerCase();

  const stats = useMemo(() => {
    const m = new Map<string, { contacts: number; open: number; won: number; tickets: number }>();
    data.companies.forEach((c) => m.set(c.id, { contacts: 0, open: 0, won: 0, tickets: 0 }));
    data.contacts.forEach((c) => c.companyId && m.get(c.companyId) && m.get(c.companyId)!.contacts++);
    data.deals.forEach((d) => {
      const s = d.companyId && m.get(d.companyId);
      if (!s) return;
      if (isOpen(d)) s.open += d.amount;
      if (d.stage === "won") s.won += d.amount;
    });
    data.tickets.forEach((t) => t.companyId && m.get(t.companyId) && (t.status === "Open" || t.status === "In Progress" || t.status === "Waiting") && m.get(t.companyId)!.tickets++);
    return m;
  }, [data]);

  const rows = useMemo(
    () =>
      data.companies.filter(
        (c) =>
          (!industry || c.industry === industry) &&
          (!owner || c.ownerId === owner) &&
          (!query || [c.name, c.city, c.industry, c.website].some((x) => x.toLowerCase().includes(query))),
      ),
    [data.companies, industry, owner, query],
  );

  const columns: Column<Company>[] = [
    {
      id: "name",
      header: "Company",
      sortValue: (c) => c.name,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <CompanyAvatar name={c.name} size={36} />
          <div>
            <p className="font-medium text-fg group-hover:text-primary">{c.name}</p>
            <p className="text-xs text-muted">{c.website}</p>
          </div>
        </div>
      ),
    },
    { id: "industry", header: "Industry", hideable: true, defaultHidden: true, sortValue: (c) => c.industry, cell: (c) => c.industry || "—" },
    { id: "location", header: "Location", hideable: true, sortValue: (c) => c.city, cell: (c) => [c.city, c.country].filter(Boolean).join(", ") || "—" },
    { id: "contacts", header: "Contacts", hideable: true, align: "right", sortValue: (c) => stats.get(c.id)!.contacts, cell: (c) => stats.get(c.id)!.contacts },
    { id: "open", header: "Open Pipeline", hideable: true, align: "right", sortValue: (c) => stats.get(c.id)!.open, cell: (c) => money.compact(stats.get(c.id)!.open) },
    { id: "won", header: "Won Revenue", align: "right", sortValue: (c) => stats.get(c.id)!.won, cell: (c) => <span className="font-semibold text-fg">{money.compact(stats.get(c.id)!.won)}</span> },
    { id: "tickets", header: "Open Tickets", hideable: true, defaultHidden: true, align: "right", sortValue: (c) => stats.get(c.id)!.tickets, cell: (c) => stats.get(c.id)!.tickets },
    { id: "employees", header: "Size", hideable: true, defaultHidden: true, cell: (c) => c.employees || "—" },
    { id: "owner", header: "Owner", hideable: true, sortValue: (c) => c.ownerId, cell: (c) => <OwnerCell userId={c.ownerId} /> },
    { id: "created", header: "Created", hideable: true, defaultHidden: true, sortValue: (c) => c.createdAt, cell: (c) => formatDate(c.createdAt) },
    { id: "actions", header: "", className: "w-10", cell: (c) => <RowActions kind="company" id={c.id} name={c.name} /> },
  ];

  return (
    <>
      <PageHeader
        title="Companies"
        description="Accounts and the relationships behind them."
        actions={
          <>
            <Button
              icon={Download}
              onClick={() => {
                downloadCSV("companies.csv", [
                  ["Company", "Industry", "City", "Website", "Phone", "Employees", "Contacts", "Open pipeline", "Won revenue"],
                  ...rows.map((c) => [c.name, c.industry, c.city, c.website, c.phone, c.employees, stats.get(c.id)!.contacts, stats.get(c.id)!.open, stats.get(c.id)!.won]),
                ]);
                toast.success("Export ready", `${rows.length} companies exported`);
              }}
            >
              Export
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => openForm("company")}>Add company</Button>
          </>
        }
      />
      <DataTable
        rows={rows}
        columns={columns}
        getId={(c) => c.id}
        onRowClick={(c) => router.push(`/companies/${c.id}`)}
        initialSort={{ id: "won", dir: "desc" }}
        toolbar={
          <>
            <div className="relative w-full sm:w-72">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies…" className="pl-9" />
            </div>
            <Select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-auto">
              <option value="">All industries</option>
              {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
            </Select>
            <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-auto">
              <option value="">All owners</option>
              {data.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </>
        }
        bulkActions={(ids, clear) => (
          <Button size="sm" icon={Trash2} className="text-[var(--red)]" onClick={() => deleteRecord("company", ids, "", clear)}>Delete</Button>
        )}
        empty={
          data.companies.length === 0 ? (
            <EmptyState icon={Building2} title="No companies yet" description="Add the organisations you work with." action={<Button variant="primary" icon={Plus} onClick={() => openForm("company")}>Add company</Button>} />
          ) : undefined
        }
      />
    </>
  );
}
