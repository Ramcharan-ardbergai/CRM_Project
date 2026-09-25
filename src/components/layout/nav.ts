import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckSquare,
  Handshake,
  Kanban,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "tasks" | "tickets";
}

/**
 * Focus CRM flow as the baseline, plus Calendar from the Apex reference.
 * Non-CRM modules (eCommerce, HR, Finance, Academy…) are intentionally left out.
 */
export const NAV: { section: string; items: NavItem[] }[] = [
  { section: "Overview", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "CRM",
    items: [
      { href: "/contacts", label: "Contacts", icon: Users },
      { href: "/companies", label: "Companies", icon: Building2 },
      { href: "/deals", label: "Deals", icon: Handshake },
      { href: "/pipeline", label: "Pipeline", icon: Kanban },
    ],
  },
  {
    section: "Work",
    items: [
      { href: "/activities", label: "Activities", icon: Zap },
      { href: "/tasks", label: "Tasks", icon: CheckSquare, badge: "tasks" },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/tickets", label: "Tickets", icon: LifeBuoy, badge: "tickets" },
    ],
  },
  { section: "Insights", items: [{ href: "/reports", label: "Reports", icon: BarChart3 }] },
  { section: "Workspace", items: [{ href: "/settings", label: "Settings", icon: Settings }] },
];

export const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
