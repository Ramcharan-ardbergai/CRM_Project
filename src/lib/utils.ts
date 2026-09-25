import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const uid = (prefix = "") => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const DAY = 86_400_000;

export function formatMoney(value: number, currency: "INR" | "USD", compact = false) {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export const formatNumber = (n: number) => new Intl.NumberFormat("en-IN").format(n);

export const formatDate = (iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", opts) : "—";

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export const formatDateTime = (iso: string) => `${formatDate(iso, { day: "numeric", month: "short" })}, ${formatTime(iso)}`;

export function startOfDay(d: Date | string = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export const isSameDay = (a: string | Date, b: string | Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  const units: [number, string][] = [
    [DAY * 365, "y"],
    [DAY * 30, "mo"],
    [DAY * 7, "w"],
    [DAY, "d"],
    [3_600_000, "h"],
    [60_000, "m"],
  ];
  for (const [ms, label] of units) {
    if (abs >= ms) {
      const v = Math.floor(abs / ms);
      return future ? `in ${v}${label}` : `${v}${label} ago`;
    }
  }
  return "just now";
}

/** "Today", "Tomorrow", "Yesterday", or a short date. */
export function dayLabel(iso: string) {
  const d = startOfDay(iso).getTime();
  const t = startOfDay().getTime();
  if (d === t) return "Today";
  if (d === t + DAY) return "Tomorrow";
  if (d === t - DAY) return "Yesterday";
  return formatDate(iso, { weekday: "short", day: "numeric", month: "short" });
}

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export const pctChange = (current: number, previous: number) =>
  previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

/** Value for an <input type="date">. */
export const toDateInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Value for an <input type="datetime-local">. */
export const toDateTimeInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${toDateInput(iso)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fromDateInput = (v: string) => (v ? new Date(v.length === 10 ? `${v}T12:00` : v).toISOString() : "");

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
