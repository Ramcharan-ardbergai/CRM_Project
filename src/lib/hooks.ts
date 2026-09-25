"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";
import { useCRM } from "./store";
import type { CRMData, ID } from "./types";
import { formatMoney } from "./utils";

/** The whole dataset as a stable object (for metrics). */
export function useData(): CRMData {
  return useCRM(
    useShallow((s) => ({
      users: s.users,
      companies: s.companies,
      contacts: s.contacts,
      deals: s.deals,
      activities: s.activities,
      tasks: s.tasks,
      tickets: s.tickets,
      events: s.events,
    })),
  );
}

/** Id → record maps for resolving relations. */
export function useLookup() {
  const users = useCRM((s) => s.users);
  const companies = useCRM((s) => s.companies);
  const contacts = useCRM((s) => s.contacts);
  const deals = useCRM((s) => s.deals);
  return useMemo(() => {
    const index = <T extends { id: ID }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
    return { users: index(users), companies: index(companies), contacts: index(contacts), deals: index(deals) };
  }, [users, companies, contacts, deals]);
}

export function useMoney() {
  const currency = useCRM((s) => s.settings.currency);
  return useMemo(
    () => ({
      full: (v: number) => formatMoney(v, currency),
      compact: (v: number) => formatMoney(v, currency, true),
      symbol: currency === "INR" ? "₹" : "$",
    }),
    [currency],
  );
}

const subscribeHydration = (cb: () => void) => useCRM.persist.onFinishHydration(cb);

/** True once persisted state is loaded on the client. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribeHydration,
    () => useCRM.persist.hasHydrated(),
    () => false,
  );
}

export function useDebounced<T>(value: T, ms = 150) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export const contactName = (c?: { firstName: string; lastName: string } | null) => (c ? `${c.firstName} ${c.lastName}` : "—");
