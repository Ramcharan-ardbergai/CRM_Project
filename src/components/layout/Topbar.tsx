"use client";

import {
  AlertCircle,
  Bell,
  Building2,
  CalendarClock,
  CheckSquare,
  Handshake,
  LifeBuoy,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  UserPlus,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { OPEN_TICKET_STATUSES } from "@/lib/constants";
import { useCRM, useMe } from "@/lib/store";
import { openForm, useUI } from "@/lib/ui-store";
import { cn, DAY, dayLabel, formatTime, startOfDay } from "@/lib/utils";
import { Menu } from "../ui/overlay";
import { Avatar, Button, IconTile } from "../ui/primitives";

function Notifications() {
  const me = useMe();
  const tasks = useCRM((s) => s.tasks);
  const tickets = useCRM((s) => s.tickets);
  const activities = useCRM((s) => s.activities);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const items = useMemo(() => {
    const today = startOfDay().getTime();
    const tomorrow = today + DAY;
    const out: { id: string; icon: typeof Bell; tone: "red" | "amber" | "blue" | "violet"; title: string; meta: string; href: string }[] = [];
    tasks
      .filter((t) => t.status === "todo" && t.assigneeId === me.id && new Date(t.dueDate).getTime() < tomorrow)
      .forEach((t) => {
        const overdue = new Date(t.dueDate).getTime() < today;
        out.push({ id: t.id, icon: overdue ? AlertCircle : CheckSquare, tone: overdue ? "red" : "amber", title: t.title, meta: overdue ? `Overdue · ${dayLabel(t.dueDate)}` : "Due today", href: "/tasks" });
      });
    tickets
      .filter((t) => OPEN_TICKET_STATUSES.includes(t.status) && (t.priority === "Urgent" || t.priority === "High") && t.assigneeId === me.id)
      .forEach((t) => out.push({ id: t.id, icon: LifeBuoy, tone: "violet", title: `#${t.number} ${t.subject}`, meta: `${t.priority} priority ticket`, href: `/tickets/${t.id}` }));
    activities
      .filter((a) => a.status === "planned" && a.ownerId === me.id && new Date(a.date).getTime() >= today && new Date(a.date).getTime() < tomorrow)
      .forEach((a) => out.push({ id: a.id, icon: CalendarClock, tone: "blue", title: a.subject, meta: `Today at ${formatTime(a.date)}`, href: "/activities" }));
    return out;
  }, [tasks, tickets, activities, me.id]);

  const unread = items.filter((i) => !seen.has(i.id)).length;

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="icon" icon={Bell} aria-label="Notifications" onClick={() => setOpen((o) => !o)} className="relative">
        {unread > 0 && <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-[var(--red)] ring-2 ring-bg" />}
      </Button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22.5rem,calc(100vw-2rem))] animate-pop-in overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-fg">Notifications {unread > 0 && <span className="tone-red ml-1 rounded-full px-1.5 text-xs">{unread}</span>}</p>
            <button className="text-xs font-medium text-primary hover:underline" onClick={() => setSeen(new Set(items.map((i) => i.id)))}>
              Mark all read
            </button>
          </div>
          <div className="scroll-thin max-h-[23.75rem] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">You&apos;re all caught up 🎉</p>
            ) : (
              items.map((i) => (
                <Link
                  key={i.id}
                  href={i.href}
                  onClick={() => {
                    setSeen((s) => new Set(s).add(i.id));
                    setOpen(false);
                  }}
                  className={cn("flex gap-3 border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-surface-2", !seen.has(i.id) && "bg-primary-soft/30")}
                >
                  <IconTile icon={i.icon} tone={i.tone} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{i.title}</p>
                    <p className="text-xs text-muted">{i.meta}</p>
                  </div>
                  {!seen.has(i.id) && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const router = useRouter();
  const me = useMe();
  const theme = useCRM((s) => s.settings.theme);
  const updateSettings = useCRM((s) => s.updateSettings);
  const logout = useCRM((s) => s.logout);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const setMobileNav = useUI((s) => s.setMobileNav);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-md md:px-6">
      <Button variant="ghost" size="icon" icon={MenuIcon} className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open menu" />

      <button
        onClick={() => setSearchOpen(true)}
        aria-label="Search"
        className="flex h-9 min-w-0 flex-1 max-w-md items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-sm text-subtle shadow-card transition-colors hover:border-line-strong"
      >
        <Search className="h-4 w-4" />
        <span className="hidden flex-1 truncate text-left sm:block">Search contacts, companies, deals…</span>
        <span className="flex-1 truncate text-left sm:hidden">Search…</span>
        <kbd className="hidden rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted sm:inline">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Menu
          width="w-52"
          trigger={(p) => (
            <Button variant="primary" icon={Plus} {...p} className="max-sm:w-9 max-sm:px-0">
              <span className="hidden sm:inline">New</span>
            </Button>
          )}
          items={[
            { label: "Contact", icon: UserPlus, onSelect: () => openForm("contact") },
            { label: "Company", icon: Building2, onSelect: () => openForm("company") },
            { label: "Deal", icon: Handshake, onSelect: () => openForm("deal") },
            "divider",
            { label: "Task", icon: CheckSquare, onSelect: () => openForm("task") },
            { label: "Activity", icon: Zap, onSelect: () => openForm("activity") },
            { label: "Ticket", icon: LifeBuoy, onSelect: () => openForm("ticket") },
          ]}
        />
        <Button icon={Sparkles} onClick={() => useUI.getState().setAssistantOpen(true)} className="max-md:hidden">
          Ask AI
        </Button>
        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <Button
          variant="ghost"
          size="icon"
          icon={theme === "dark" ? Sun : Moon}
          aria-label="Toggle theme"
          onClick={() => updateSettings({ theme: theme === "dark" ? "light" : "dark" })}
          className="max-sm:hidden"
        />
        <Notifications />
        <Menu
          width="w-56"
          header={
            <div className="border-b border-line px-2.5 pt-1.5 pb-2.5 mb-1">
              <p className="text-sm font-semibold text-fg">{me.name}</p>
              <p className="text-xs text-muted">{me.role}</p>
            </div>
          }
          trigger={(p) => (
            <button {...p} className="ml-1 rounded-full" aria-label="Account menu">
              <Avatar name={me.name} color={me.color} size={34} />
            </button>
          )}
          items={[
            { label: "Settings", icon: Settings, onSelect: () => router.push("/settings") },
            { label: "Sign out", icon: LogOut, danger: true, onSelect: () => { logout(); router.replace("/login"); } },
          ]}
        />
      </div>
    </header>
  );
}
