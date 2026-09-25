"use client";

import { Database, FileSpreadsheet, Moon, Palette, RotateCcw, Sun, Trash2, User, Users } from "lucide-react";
import { useState } from "react";
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, PageHeader, Segmented, Select } from "@/components/ui/primitives";
import { useData } from "@/lib/hooks";
import { useCRM, useMe } from "@/lib/store";
import { confirmDialog, toast } from "@/lib/ui-store";
import { formatDateTime } from "@/lib/utils";

export default function SettingsPage() {
  const me = useMe();
  const settings = useCRM((s) => s.settings);
  const updateSettings = useCRM((s) => s.updateSettings);
  const updateUser = useCRM((s) => s.updateUser);
  const importFromCSV = useCRM((s) => s.importFromCSV);
  const importReport = useCRM((s) => s.importReport);
  const importedAt = useCRM((s) => s.importedAt);
  const [importing, setImporting] = useState(false);
  const clearAll = useCRM((s) => s.clearAll);
  const data = useData();
  const [profile, setProfile] = useState({ name: me.name, email: me.email });
  const [workspace, setWorkspace] = useState(settings.workspace);

  const saveProfile = () => {
    if (!profile.name.trim() || !/^\S+@\S+\.\S+$/.test(profile.email)) {
      toast.error("Please enter a valid name and email");
      return;
    }
    updateUser(me.id, { name: profile.name.trim(), email: profile.email.trim() });
    updateSettings({ workspace: workspace.trim() || settings.workspace });
    toast.success("Settings saved");
  };

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile, workspace and preferences." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><User className="h-4 w-4 text-muted" /> Profile & workspace</span>} />
            <div className="px-5 pb-5">
              <div className="mb-5 flex items-center gap-4">
                <Avatar name={profile.name || me.name} color={me.color} size={56} />
                <div>
                  <p className="font-semibold text-fg">{me.name}</p>
                  <p className="text-sm text-muted">{me.role}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name"><Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field>
                <Field label="Workspace name" className="sm:col-span-2"><Input value={workspace} onChange={(e) => setWorkspace(e.target.value)} /></Field>
              </div>
              <div className="mt-5 flex justify-end">
                <Button variant="primary" onClick={saveProfile}>Save changes</Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Palette className="h-4 w-4 text-muted" /> Preferences</span>} />
            <div className="divide-y divide-line px-5 pb-2">
              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-fg">Appearance</p>
                  <p className="text-xs text-muted">Switch between light and dark mode.</p>
                </div>
                <Segmented
                  value={settings.theme}
                  onChange={(theme) => updateSettings({ theme })}
                  options={[
                    { id: "light", label: <><Sun className="h-3.5 w-3.5" /> Light</> },
                    { id: "dark", label: <><Moon className="h-3.5 w-3.5" /> Dark</> },
                  ]}
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-fg">Currency</p>
                  <p className="text-xs text-muted">Used for all deal amounts and reports.</p>
                </div>
                <Select value={settings.currency} onChange={(e) => { updateSettings({ currency: e.target.value as "INR" | "USD" }); toast.success("Currency updated"); }} className="w-40">
                  <option value="INR">₹ Indian Rupee</option>
                  <option value="USD">$ US Dollar</option>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Users className="h-4 w-4 text-muted" /> Team</span>} subtitle={`${data.users.length} members`} />
            <div className="divide-y divide-line px-5 pb-3">
              {data.users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-3">
                  <Avatar name={u.name} color={u.color} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{u.name} {u.id === me.id && <span className="text-xs text-muted">(you)</span>}</p>
                    <p className="truncate text-xs text-muted">{u.email}</p>
                  </div>
                  <Badge tone={u.role === "Support Agent" ? "violet" : u.role === "Sales Manager" ? "blue" : "gray"}>{u.role}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Database className="h-4 w-4 text-muted" /> Data</span>} subtitle={`Imported from the CSV files in Data/${importedAt ? ` · ${formatDateTime(importedAt)}` : ""}. Edits are saved in this browser.`} />
            <div className="grid grid-cols-3 gap-2 px-5">
              {[["Contacts", data.contacts.length], ["Companies", data.companies.length], ["Deals", data.deals.length], ["Activities", data.activities.length], ["Tasks", data.tasks.length], ["Tickets", data.tickets.length]].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-surface-2 px-3 py-2">
                  <p className="text-[11px] text-muted">{l}</p>
                  <p className="font-semibold text-fg">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 p-5">
              <Button
                icon={RotateCcw}
                loading={importing}
                onClick={async () => {
                  if (await confirmDialog({ title: "Re-import from CSV files?", message: "All current records will be replaced with the data in the Data folder.", confirmLabel: "Re-import" })) {
                    setImporting(true);
                    importFromCSV()
                      .then(() => toast.success("Data re-imported from CSV files"))
                      .catch((e: Error) => toast.error("Import failed", e.message))
                      .finally(() => setImporting(false));
                  }
                }}
              >
                Re-import CSV data
              </Button>
              <Button
                icon={Trash2}
                className="text-[var(--red)]"
                onClick={async () => {
                  if (await confirmDialog({ title: "Delete all records?", message: "Contacts, companies, deals, activities, tasks and tickets will be permanently removed.", confirmLabel: "Delete everything" })) {
                    clearAll();
                    toast.success("All records deleted", "Re-import the CSV data anytime.");
                  }
                }}
              >
                Clear all data
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader
          title={<span className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-muted" /> Data sources</span>}
          subtitle={`${importReport.length} CSV files · records are merged across files by company domain, contact email/name, deal and ticket name`}
        />
        <div className="scroll-thin overflow-x-auto px-5 pb-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted uppercase">
                <th className="py-2 pr-4">File</th>
                <th className="py-2 pr-4 text-right">Rows</th>
                <th className="py-2 pr-4">New records</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {importReport.map((r) => (
                <tr key={r.file} className="border-b border-line align-top last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-fg">{r.file}</td>
                  <td className="py-2.5 pr-4 text-right text-fg-2">{r.rows}</td>
                  <td className="py-2.5 pr-4 whitespace-nowrap text-fg-2">
                    {Object.entries(r.created).map(([k, v]) => `${v} ${k}`).join(", ") || <span className="text-subtle">—</span>}
                  </td>
                  <td className="py-2.5 text-xs text-muted">{r.notes.join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
