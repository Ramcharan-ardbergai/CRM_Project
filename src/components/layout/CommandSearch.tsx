"use client";

import { ArrowRight, Building2, CheckSquare, CornerDownLeft, Handshake, Kanban, LifeBuoy, Plus, Search, Sparkles, User, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { STAGE_MAP } from "@/lib/constants";
import { contactName, useLookup, useMoney } from "@/lib/hooks";
import { useCRM } from "@/lib/store";
import { openDeal, openForm, useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

interface Result {
  id: string;
  group: string;
  icon: LucideIcon;
  title: string;
  meta: string;
  run: () => void;
}

export function CommandSearch() {
  const open = useUI((s) => s.searchOpen);
  const setOpen = useUI((s) => s.setSearchOpen);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const { contacts, companies, deals, tickets, tasks } = useCRM((s) => s);
  const lookup = useLookup();
  const money = useMoney();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUI.getState().searchOpen);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const go = (href: string) => () => router.push(href);
    const term = q.trim().toLowerCase();
    if (!term) {
      return [
        { id: "ai", group: "Quick actions", icon: Sparkles, title: "Ask Focus AI", meta: "Questions about your CRM data", run: () => useUI.getState().setAssistantOpen(true) },
        { id: "n-contact", group: "Quick actions", icon: Plus, title: "Create contact", meta: "Add a new person", run: () => openForm("contact") },
        { id: "n-deal", group: "Quick actions", icon: Plus, title: "Create deal", meta: "Start a new opportunity", run: () => openForm("deal") },
        { id: "n-task", group: "Quick actions", icon: Plus, title: "Create task", meta: "Plan a follow-up", run: () => openForm("task") },
        { id: "g-pipeline", group: "Go to", icon: Kanban, title: "Pipeline", meta: "Kanban board", run: go("/pipeline") },
        { id: "g-tasks", group: "Go to", icon: CheckSquare, title: "My tasks", meta: "Today & overdue", run: go("/tasks") },
        { id: "g-tickets", group: "Go to", icon: LifeBuoy, title: "Tickets", meta: "Support queue", run: go("/tickets") },
      ];
    }
    const has = (...xs: (string | undefined | null)[]) => xs.some((x) => x?.toLowerCase().includes(term));
    const out: Result[] = [];
    contacts
      .filter((c) => has(`${c.firstName} ${c.lastName}`, c.email, c.phone))
      .slice(0, 5)
      .forEach((c) => out.push({ id: c.id, group: "Contacts", icon: User, title: contactName(c), meta: `${c.title} · ${lookup.companies.get(c.companyId ?? "")?.name ?? "No company"}`, run: go(`/contacts/${c.id}`) }));
    companies
      .filter((c) => has(c.name, c.industry, c.city, c.website))
      .slice(0, 5)
      .forEach((c) => out.push({ id: c.id, group: "Companies", icon: Building2, title: c.name, meta: `${c.industry} · ${c.city}`, run: go(`/companies/${c.id}`) }));
    deals
      .filter((d) => has(d.name, lookup.companies.get(d.companyId ?? "")?.name))
      .slice(0, 5)
      .forEach((d) => out.push({ id: d.id, group: "Deals", icon: Handshake, title: d.name, meta: `${lookup.companies.get(d.companyId ?? "")?.name ?? "—"} · ${money.compact(d.amount)} · ${STAGE_MAP[d.stage].label}`, run: () => openDeal(d.id) }));
    tickets
      .filter((t) => has(t.subject, `#${t.number}`, String(t.number), lookup.companies.get(t.companyId ?? "")?.name))
      .slice(0, 5)
      .forEach((t) => out.push({ id: t.id, group: "Tickets", icon: LifeBuoy, title: `#${t.number} ${t.subject}`, meta: `${t.status} · ${t.priority}`, run: go(`/tickets/${t.id}`) }));
    tasks
      .filter((t) => has(t.title))
      .slice(0, 5)
      .forEach((t) => out.push({ id: t.id, group: "Tasks", icon: CheckSquare, title: t.title, meta: t.status === "done" ? "Completed" : "Open", run: () => openForm("task", { id: t.id }) }));
    return out;
  }, [q, contacts, companies, deals, tickets, tasks, lookup, money, router]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const select = (r?: Result) => {
    if (!r) return;
    setOpen(false);
    r.run();
  };

  const groups = [...new Set(results.map((r) => r.group))];
  let idx = -1;

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-[#0b0f1a]/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl animate-pop-in overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 text-subtle" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              if (e.key === "Enter") select(results[active]);
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search contacts, companies, deals, tickets, tasks…"
            className="h-14 flex-1 bg-transparent text-[.9375rem] text-fg outline-none placeholder:text-subtle"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
        </div>
        <div ref={listRef} className="scroll-thin max-h-[26.25rem] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">No results for &ldquo;{q}&rdquo;</p>
          ) : (
            groups.map((g) => (
              <div key={g} className="mb-1">
                <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-subtle uppercase">{g}</p>
                {results
                  .filter((r) => r.group === g)
                  .map((r) => {
                    idx++;
                    const i = idx;
                    return (
                      <button
                        key={r.id}
                        data-idx={i}
                        onMouseMove={() => setActive(i)}
                        onClick={() => select(r)}
                        className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left", active === i ? "bg-primary-soft" : "")}
                      >
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", active === i ? "bg-primary text-white" : "bg-surface-2 text-muted")}>
                          <r.icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">{r.title}</span>
                          <span className="block truncate text-xs text-muted">{r.meta}</span>
                        </span>
                        {active === i && <ArrowRight className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-4 border-t border-line bg-surface-2/50 px-4 py-2 text-[11px] text-muted">
          <span className="flex items-center gap-1"><kbd className="rounded border border-line px-1">↑</kbd><kbd className="rounded border border-line px-1">↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> open</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
