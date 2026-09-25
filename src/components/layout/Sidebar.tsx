"use client";

import { ChevronLeft, ChevronsUpDown, LogOut, Moon, RotateCcw, Settings, Sun, Target, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { OPEN_TICKET_STATUSES } from "@/lib/constants";
import { useCRM, useMe } from "@/lib/store";
import { confirmDialog, toast, useUI } from "@/lib/ui-store";
import { cn, startOfDay, DAY } from "@/lib/utils";
import { Menu } from "../ui/overlay";
import { Avatar, Tooltip } from "../ui/primitives";
import { isActive, NAV } from "./nav";

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5b6cff] to-[#3a45d6] text-white shadow-md shadow-primary/30">
        <Target className="h-[18px] w-[18px]" strokeWidth={2.4} />
      </span>
      {!collapsed && (
        <span className="text-[17px] font-semibold tracking-tight text-fg">
          Focus<span className="text-primary">CRM</span>
        </span>
      )}
    </div>
  );
}

function useBadges() {
  const me = useMe();
  const tasks = useCRM((s) => s.tasks);
  const tickets = useCRM((s) => s.tickets);
  return useMemo(() => {
    const endOfToday = startOfDay().getTime() + DAY;
    return {
      tasks: tasks.filter((t) => t.status === "todo" && t.assigneeId === me.id && new Date(t.dueDate).getTime() < endOfToday).length,
      tickets: tickets.filter((t) => OPEN_TICKET_STATUSES.includes(t.status)).length,
    };
  }, [tasks, tickets, me.id]);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const collapsedPref = useCRM((s) => s.sidebarCollapsed);
  const toggleSidebar = useCRM((s) => s.toggleSidebar);
  const workspace = useCRM((s) => s.settings.workspace);
  const theme = useCRM((s) => s.settings.theme);
  const updateSettings = useCRM((s) => s.updateSettings);
  const importFromCSV = useCRM((s) => s.importFromCSV);
  const logout = useCRM((s) => s.logout);
  const mobileOpen = useUI((s) => s.mobileNavOpen);
  const setMobileNav = useUI((s) => s.setMobileNav);
  const me = useMe();
  const badges = useBadges();
  // The mobile drawer always shows labels.
  const collapsed = collapsedPref && !mobileOpen;

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 animate-fade-in bg-black/30 lg:hidden" onClick={() => setMobileNav(false)} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-surface transition-[width,transform] duration-200",
          collapsed ? "w-[76px]" : "w-[264px]",
          mobileOpen ? "translate-x-0 shadow-pop" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className={cn("flex h-16 items-center", collapsed ? "justify-center" : "justify-between px-5")}>
          <Link href="/dashboard" aria-label="Focus CRM dashboard">
            <Logo collapsed={collapsed} />
          </Link>
          <button className="rounded-md p-1 text-muted hover:bg-surface-2 lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-[22px] -right-3 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-card transition-colors hover:text-fg lg:flex"
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
        </button>

        {/* Workspace selector */}
        <div className={cn("px-3 pb-2", collapsed && "px-3.5")}>
          <Menu
            align="left"
            width="w-60"
            header={<p className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-wider text-subtle uppercase">Workspace</p>}
            trigger={(p) => (
              <button
                {...p}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface-2/60 p-2 text-left transition-colors hover:border-line-strong",
                  collapsed && "justify-center p-1.5",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#111726] text-sm font-bold text-white dark:bg-[#2a3144]">
                  {workspace.charAt(0)}
                </span>
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-fg">{workspace}</span>
                      <span className="block text-xs text-muted">Growth Workspace</span>
                    </span>
                    <ChevronsUpDown className="h-4 w-4 text-subtle" />
                  </>
                )}
              </button>
            )}
            items={[
              { label: "Workspace settings", icon: Settings, onSelect: () => router.push("/settings") },
              {
                label: "Re-import CSV data",
                icon: RotateCcw,
                onSelect: async () => {
                  if (await confirmDialog({ title: "Re-import from CSV files?", message: "All current records will be replaced with the data in the Data folder.", confirmLabel: "Re-import" })) {
                    importFromCSV()
                      .then(() => toast.success("Data re-imported from CSV files"))
                      .catch((e: Error) => toast.error("Import failed", e.message));
                  }
                },
              },
            ]}
          />
        </div>

        <nav className="scroll-thin flex-1 overflow-y-auto px-3 pb-4">
          {NAV.map((group) => (
            <div key={group.section} className="mt-4 first:mt-2">
              {collapsed ? (
                <div className="mx-auto mb-2 h-px w-6 bg-line" />
              ) : (
                <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-subtle uppercase">{group.section}</p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const count = item.badge ? badges[item.badge] : 0;
                  return (
                    <li key={item.href}>
                      <Tooltip label={item.label} disabled={!collapsed}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileNav(false)}
                          className={cn(
                            "relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            collapsed && "justify-center px-0",
                            active ? "bg-primary-soft text-primary" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
                          )}
                        >
                          {active && <span className="absolute top-1.5 bottom-1.5 -left-3 w-[3px] rounded-r-full bg-primary" />}
                          <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.3 : 1.9} />
                          {!collapsed && <span className="flex-1">{item.label}</span>}
                          {count > 0 &&
                            (collapsed ? (
                              <span className="absolute top-1 right-2.5 h-2 w-2 rounded-full bg-[var(--red)] ring-2 ring-surface" />
                            ) : (
                              <span className={cn("rounded-full px-1.5 py-px text-[11px] font-semibold", item.badge === "tasks" ? "tone-red" : "tone-blue")}>
                                {count}
                              </span>
                            ))}
                        </Link>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <Menu
            align="left"
            width="w-56"
            trigger={(p) => (
              <button {...p} className={cn("flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-surface-2", collapsed && "justify-center")}>
                <Avatar name={me.name} color={me.color} size={34} />
                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{me.name}</span>
                    <span className="block truncate text-xs text-muted">{me.email}</span>
                  </span>
                )}
                {!collapsed && <ChevronsUpDown className="h-4 w-4 text-subtle" />}
              </button>
            )}
            items={[
              { label: "Profile & settings", icon: Settings, onSelect: () => router.push("/settings") },
              {
                label: theme === "dark" ? "Light mode" : "Dark mode",
                icon: theme === "dark" ? Sun : Moon,
                onSelect: () => updateSettings({ theme: theme === "dark" ? "light" : "dark" }),
              },
              "divider",
              {
                label: "Sign out",
                icon: LogOut,
                danger: true,
                onSelect: () => {
                  logout();
                  router.replace("/login");
                },
              },
            ]}
          />
        </div>
      </aside>
    </>
  );
}
