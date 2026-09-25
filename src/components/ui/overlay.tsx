"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "./primitives";

function useEscape(onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, active]);
}

function Portal({ children }: { children: ReactNode }) {
  return typeof document === "undefined" ? null : createPortal(children, document.body);
}

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEscape(onClose, open);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div className="absolute inset-0 animate-fade-in bg-[#0b0f1a]/40 backdrop-blur-[2px]" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            "relative flex max-h-[92vh] w-full animate-pop-in flex-col rounded-t-2xl border border-line bg-surface shadow-pop sm:rounded-2xl",
            { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl" }[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-fg">{title}</h2>
              {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
            </div>
            <Button variant="ghost" size="icon-sm" icon={X} onClick={onClose} aria-label="Close" />
          </div>
          <div className="scroll-thin overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line bg-surface-2/50 px-6 py-3.5 sm:rounded-b-2xl">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

/* ---------------- Drawer ---------------- */
export function Drawer({ open, onClose, children, width = "max-w-xl" }: { open: boolean; onClose: () => void; children: ReactNode; width?: string }) {
  useEscape(onClose, open);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 animate-fade-in bg-[#0b0f1a]/30" onClick={onClose} />
        <aside className={cn("absolute inset-y-0 right-0 flex w-full animate-slide-in flex-col border-l border-line bg-surface shadow-pop", width)}>
          {children}
        </aside>
      </div>
    </Portal>
  );
}

/* ---------------- Dropdown menu ---------------- */
export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  hint?: string;
}

export function Menu({ trigger, items, align = "right", header, width = "w-52" }: {
  trigger: (props: { onClick: (e: React.MouseEvent) => void; "aria-expanded": boolean }) => ReactNode;
  items: (MenuItem | "divider")[];
  align?: "left" | "right";
  header?: ReactNode;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEscape(() => setOpen(false), open);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({
        onClick: (e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        },
        "aria-expanded": open,
      })}
      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute z-40 mt-1.5 animate-pop-in rounded-xl border border-line bg-surface p-1 shadow-pop",
            width,
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {header}
          {items.map((item, i) =>
            item === "divider" ? (
              <div key={i} className="my-1 h-px bg-line" />
            ) : (
              <button
                key={item.label}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  item.danger ? "text-[var(--red)] hover:bg-[var(--red-soft)]" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
                )}
              >
                {item.icon && <item.icon className="h-4 w-4 opacity-80" />}
                <span className="flex-1">{item.label}</span>
                {item.hint && <span className="text-xs text-subtle">{item.hint}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Toasts ---------------- */
const toastIcon = { success: CheckCircle2, error: XCircle, info: Info };
const toastColor = { success: "text-tone-green", error: "text-tone-red", info: "text-primary" };

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = toastIcon[t.tone];
        return (
          <div key={t.id} role="status" className="pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-pop">
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", toastColor[t.tone])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] text-muted">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-subtle hover:text-fg" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Confirm dialog ---------------- */
export function ConfirmHost() {
  const req = useUI((s) => s.confirmReq);
  const setConfirm = useUI((s) => s.setConfirm);
  const close = (ok: boolean) => {
    req?.resolve(ok);
    setConfirm(null);
  };
  useEscape(() => close(false), !!req);
  if (!req) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 animate-fade-in bg-[#0b0f1a]/40 backdrop-blur-[2px]" onClick={() => close(false)} />
        <div role="alertdialog" className="relative w-full max-w-sm animate-pop-in rounded-2xl border border-line bg-surface p-6 shadow-pop">
          <div className="tone-red mb-4 flex h-11 w-11 items-center justify-center rounded-xl">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-fg">{req.title}</h2>
          <p className="mt-1.5 text-sm text-muted">{req.message}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => close(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => close(true)} autoFocus>
              {req.confirmLabel ?? "Delete"}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
