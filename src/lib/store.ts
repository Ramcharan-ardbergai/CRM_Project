"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STAGE_MAP } from "./constants";
import type { ImportFileReport, ImportResult } from "./import/hubspot";
import type {
  Activity,
  Company,
  Contact,
  CRMData,
  Deal,
  DealStage,
  ID,
  Settings,
  Task,
  Ticket,
  TicketStatus,
  TimelineEvent,
} from "./types";
import { uid } from "./utils";

export interface Collections {
  contacts: Contact;
  companies: Company;
  deals: Deal;
  activities: Activity;
  tasks: Task;
  tickets: Ticket;
}
export type CollectionKey = keyof Collections;
export type NewRecord<K extends CollectionKey> = Omit<Collections[K], "id" | "createdAt"> & { createdAt?: string };

/** Foreign-key field each collection is referenced by elsewhere. */
const FK: Partial<Record<CollectionKey, "contactId" | "companyId" | "dealId" | "ticketId">> = {
  contacts: "contactId",
  companies: "companyId",
  deals: "dealId",
  tickets: "ticketId",
};

const PREFIX: Record<CollectionKey, string> = {
  contacts: "c",
  companies: "co",
  deals: "d",
  activities: "a",
  tasks: "t",
  tickets: "tk",
};

interface CRMState extends CRMData {
  settings: Settings;
  sessionUserId: ID | null;
  sidebarCollapsed: boolean;
  importedAt: string | null;
  importReport: ImportFileReport[];

  add: <K extends CollectionKey>(key: K, record: NewRecord<K>) => Collections[K];
  update: <K extends CollectionKey>(key: K, id: ID, patch: Partial<Collections[K]>) => void;
  remove: (key: CollectionKey, ids: ID | ID[]) => void;
  moveDeal: (id: ID, stage: DealStage) => void;
  setTicketStatus: (id: ID, status: TicketStatus) => void;
  toggleTask: (id: ID) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  updateUser: (id: ID, patch: Partial<CRMData["users"][number]>) => void;
  login: (userId: ID) => void;
  logout: () => void;
  toggleSidebar: () => void;
  /** Replaces all records with the data parsed from the CSV files in /Data. */
  importFromCSV: () => Promise<void>;
  clearAll: () => void;
}

export const useCRM = create<CRMState>()(
  persist(
    (set, get) => {
      const me = () => get().sessionUserId ?? get().users[0]?.id ?? "";
      const event = (text: string, rel: Partial<TimelineEvent>): TimelineEvent => ({
        id: uid("e"),
        at: new Date().toISOString(),
        text,
        userId: me(),
        contactId: null,
        companyId: null,
        dealId: null,
        ticketId: null,
        ...rel,
      });

      return {
        users: [],
        companies: [],
        contacts: [],
        deals: [],
        activities: [],
        tasks: [],
        tickets: [],
        events: [],
        settings: { workspace: "Focus CRM", currency: "USD", theme: "light" },
        sessionUserId: null,
        sidebarCollapsed: false,
        importedAt: null,
        importReport: [],

        add: (key, record) => {
          const created = { createdAt: new Date().toISOString(), ...record, id: uid(PREFIX[key]) } as unknown as Collections[typeof key];
          const events: TimelineEvent[] = [];
          if (key === "deals") {
            const d = created as Deal;
            events.push(event(`Deal "${d.name}" created`, { dealId: d.id, contactId: d.contactId, companyId: d.companyId }));
          } else if (key === "tickets") {
            const t = created as Ticket;
            events.push(event("Ticket opened", { ticketId: t.id, contactId: t.contactId, companyId: t.companyId }));
          } else if (key === "contacts") {
            const c = created as Contact;
            events.push(event(`Contact ${c.firstName} ${c.lastName} added`, { contactId: c.id, companyId: c.companyId }));
          }
          set((s) => ({ [key]: [created, ...(s[key] as unknown[])], events: [...events, ...s.events] }) as Partial<CRMState>);
          return created;
        },

        update: (key, id, patch) => {
          const s = get();
          if (key === "deals" && "stage" in patch) {
            const { stage, ...rest } = patch as Partial<Deal>;
            if (Object.keys(rest).length) set({ deals: s.deals.map((d) => (d.id === id ? { ...d, ...rest } : d)) });
            get().moveDeal(id, stage!);
            return;
          }
          if (key === "tickets" && "status" in patch) {
            const { status, ...rest } = patch as Partial<Ticket>;
            if (Object.keys(rest).length) set({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, ...rest, updatedAt: new Date().toISOString() } : t)) });
            get().setTicketStatus(id, status!);
            return;
          }
          set({
            [key]: (s[key] as { id: ID }[]).map((r) => (r.id === id ? { ...r, ...patch } : r)),
          } as Partial<CRMState>);
        },

        remove: (key, ids) => {
          const list = new Set(Array.isArray(ids) ? ids : [ids]);
          const fk = FK[key];
          set((s) => {
            const next: Partial<CRMState> = { [key]: (s[key] as { id: ID }[]).filter((r) => !list.has(r.id)) } as Partial<CRMState>;
            if (fk) {
              // Unlink references so related records survive without dangling ids.
              (["contacts", "deals", "activities", "tasks", "tickets"] as CollectionKey[]).forEach((k) => {
                if (k === key) return;
                const src = (next[k] ?? s[k]) as unknown as Record<string, unknown>[];
                (next as Record<string, unknown>)[k] = src.map((r) => (fk in r && list.has(r[fk] as ID) ? { ...r, [fk]: null } : r));
              });
              if (key === "tickets") next.activities = (next.activities ?? s.activities).filter((a) => !a.ticketId || !list.has(a.ticketId));
              const hit = (e: TimelineEvent) => !!e[fk] && list.has(e[fk]!);
              next.events =
                key === "deals" || key === "tickets"
                  ? s.events.filter((e) => !hit(e))
                  : s.events.map((e) => (hit(e) ? { ...e, [fk]: null } : e));
            }
            return next;
          });
        },

        moveDeal: (id, stage) => {
          const deal = get().deals.find((d) => d.id === id);
          if (!deal || deal.stage === stage) return;
          const closed = stage === "won" || stage === "lost";
          set((s) => ({
            deals: s.deals.map((d) =>
              d.id === id
                ? { ...d, stage, probability: STAGE_MAP[stage].probability, closedAt: closed ? new Date().toISOString() : null }
                : d,
            ),
            // Winning a deal turns its contact into a customer.
            contacts:
              stage === "won" && deal.contactId
                ? s.contacts.map((c) => (c.id === deal.contactId ? { ...c, status: "Customer" } : c))
                : s.contacts,
            events: [
              event(`Deal "${deal.name}" moved to ${STAGE_MAP[stage].label}`, {
                dealId: id,
                contactId: deal.contactId,
                companyId: deal.companyId,
              }),
              ...s.events,
            ],
          }));
        },

        setTicketStatus: (id, status) => {
          const t = get().tickets.find((x) => x.id === id);
          if (!t || t.status === status) return;
          const now = new Date().toISOString();
          const resolved = status === "Resolved" || status === "Closed";
          set((s) => ({
            tickets: s.tickets.map((x) =>
              x.id === id ? { ...x, status, updatedAt: now, resolvedAt: resolved ? (x.resolvedAt ?? now) : null } : x,
            ),
            events: [event(`Status changed to ${status}`, { ticketId: id, contactId: t.contactId, companyId: t.companyId }), ...s.events],
          }));
        },

        toggleTask: (id) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id
                ? t.status === "done"
                  ? { ...t, status: "todo", completedAt: null }
                  : { ...t, status: "done", completedAt: new Date().toISOString() }
                : t,
            ),
          })),

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        updateUser: (id, patch) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
        login: (userId) => set({ sessionUserId: userId }),
        logout: () => set({ sessionUserId: null }),
        toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
        importFromCSV: async () => {
          const res = await fetch("/api/import", { cache: "no-store" });
          const body = (await res.json()) as ImportResult | { error: string };
          if ("error" in body) throw new Error(body.error);
          const session = get().sessionUserId;
          set({
            ...body.data,
            importedAt: body.importedAt,
            importReport: body.report,
            // Keep the session only if that user still exists in the imported data.
            sessionUserId: body.data.users.some((u) => u.id === session) ? session : null,
          });
        },
        clearAll: () =>
          set((s) => ({ companies: [], contacts: [], deals: [], activities: [], tasks: [], tickets: [], events: [], users: s.users })),
      };
    },
    {
      name: "focus-crm-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ add, update, remove, moveDeal, setTicketStatus, toggleTask, updateSettings, updateUser, login, logout, toggleSidebar, importFromCSV, clearAll, ...data }) => data,
    },
  ),
);

/** The signed-in user's id (defaults to the workspace owner). */
export const useMeId = () => useCRM((s) => s.sessionUserId ?? s.users[0]?.id ?? "");
export const useMe = () => {
  const id = useMeId();
  return useCRM((s) => s.users.find((u) => u.id === id) ?? s.users[0]!);
};
