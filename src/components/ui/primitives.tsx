"use client";

import { Check, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import type { Tone } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";

/* ---------------- Button ---------------- */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover shadow-sm shadow-primary/20",
  secondary: "bg-surface text-fg border border-line hover:bg-surface-2 hover:border-line-strong shadow-card",
  ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
  danger: "bg-[var(--red)] text-white hover:opacity-90",
  soft: "bg-primary-soft text-primary hover:brightness-95",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[13px] gap-1.5 rounded-lg",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  icon: "h-9 w-9 rounded-lg",
  "icon-sm": "h-7 w-7 rounded-md",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon: Icon, loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-all duration-150 outline-none select-none",
        "focus-visible:ring-4 focus-visible:ring-[var(--ring)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : (
        Icon && <Icon className={size === "icon-sm" ? "h-4 w-4" : "h-[17px] w-[17px]"} strokeWidth={2} />
      )}
      {children}
    </button>
  );
});

/* ---------------- Form controls ---------------- */
const control =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-subtle transition-colors outline-none hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-[var(--ring)] disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...p }, ref) {
    return <input ref={ref} className={cn(control, "h-9", invalid && "border-[var(--red)]", className)} {...p} />;
  },
);

export function Select({ className, children, invalid, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn(
        control,
        "h-9 appearance-none bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239aa0b1' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        invalid && "border-[var(--red)]",
        className,
      )}
      {...p}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-[84px] resize-y py-2", className)} {...p} />;
}

export function Field({ label, error, children, className, required }: { label: string; error?: string; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-medium text-fg-2">
        {label}
        {required && <span className="ml-0.5 text-[var(--red)]">*</span>}
      </span>
      {children}
      {error && <span className="text-xs text-[var(--red)]">{error}</span>}
    </label>
  );
}

export function Checkbox({ checked, onChange, indeterminate, className, label }: { checked: boolean; onChange: (v: boolean) => void; indeterminate?: boolean; className?: string; label?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all",
        checked || indeterminate ? "border-primary bg-primary text-white" : "border-line-strong bg-surface hover:border-primary",
        className,
      )}
    >
      {indeterminate ? <span className="h-0.5 w-2 rounded bg-white" /> : checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  );
}

/* ---------------- Surfaces ---------------- */
export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface shadow-card", className)} {...p}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5 pb-3", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="shrink-0 rounded-md px-2 py-1 text-[13px] font-medium text-primary transition-colors hover:bg-primary-soft">
      {children}
    </Link>
  );
}

/* ---------------- Display ---------------- */
export function Badge({ tone = "gray", children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn(`tone-${tone}`, "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Avatar({ name, color, size = 32, className }: { name: string; color?: string; size?: number; className?: string }) {
  const hue = color ?? `hsl(${[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360} 55% 50%)`;
  return (
    <span
      title={name}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface", className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36), background: hue }}
    >
      {initials(name)}
    </span>
  );
}

/** A colorful, deterministic mark for a company without requiring uploaded assets. */
export function CompanyAvatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span
      title={name}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-xl font-bold text-white ring-2 ring-surface", className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.34),
        background: `linear-gradient(135deg, hsl(${hue} 75% 58%), hsl(${(hue + 42) % 360} 72% 45%))`,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function IconTile({ icon: Icon, tone = "blue", size = "md" }: { icon: LucideIcon; tone?: Tone; size?: "sm" | "md" }) {
  return (
    <span className={cn(`tone-${tone}`, "inline-flex shrink-0 items-center justify-center", size === "md" ? "h-10 w-10 rounded-xl" : "h-8 w-8 rounded-lg")}>
      <Icon className={size === "md" ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2} />
    </span>
  );
}

export function Progress({ value, color, className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color ?? "var(--primary)" }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-3", className)} />;
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-xs text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("scroll-thin flex gap-1 overflow-x-auto border-b border-line", className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
            value === t.id ? "border-primary text-fg" : "border-transparent text-muted hover:text-fg",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn("rounded-full px-1.5 text-[11px] font-semibold", value === t.id ? "bg-primary-soft text-primary" : "bg-surface-2 text-muted")}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, className }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-lg border border-line bg-surface-2 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-all",
            value === o.id ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tooltip({ label, children, side = "right", disabled }: { label: string; children: ReactNode; side?: "right" | "bottom"; disabled?: boolean }) {
  if (disabled) return <>{children}</>;
  return (
    <span className="group/tt relative flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 rounded-md bg-[#111726] px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-pop transition-opacity delay-150 group-hover/tt:opacity-100 dark:bg-[#2a3144]",
          side === "right" ? "top-1/2 left-full ml-2 -translate-y-1/2" : "top-full left-1/2 mt-2 -translate-x-1/2",
        )}
      >
        {label}
      </span>
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Trend({ value, invert = false, className }: { value: number; invert?: boolean; className?: string }) {
  const good = invert ? value <= 0 : value >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", good ? "text-tone-green" : "text-tone-red", className)}>
      {value >= 0 ? "↑" : "↓"} {Math.abs(value).toFixed(value !== 0 && Math.abs(value) < 10 ? 1 : 0)}%
    </span>
  );
}
