"use client";

import { create } from "zustand";
import type { EntityKind, ID } from "./types";
import { uid } from "./utils";

export type ToastTone = "success" | "error" | "info";
interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  resolve: (ok: boolean) => void;
}

export interface FormRequest {
  kind: EntityKind;
  id?: ID;
  defaults?: Record<string, unknown>;
}

interface UIState {
  toasts: Toast[];
  confirmReq: ConfirmRequest | null;
  form: FormRequest | null;
  dealPanelId: ID | null;
  searchOpen: boolean;
  mobileNavOpen: boolean;
  assistantOpen: boolean;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  setConfirm: (c: ConfirmRequest | null) => void;
  openForm: (req: FormRequest) => void;
  closeForm: () => void;
  openDeal: (id: ID | null) => void;
  setSearchOpen: (v: boolean) => void;
  setMobileNav: (v: boolean) => void;
  setAssistantOpen: (v: boolean) => void;
}

export const useUI = create<UIState>()((set) => ({
  toasts: [],
  confirmReq: null,
  form: null,
  dealPanelId: null,
  searchOpen: false,
  mobileNavOpen: false,
  assistantOpen: false,
  pushToast: (t) => {
    const id = uid("toast");
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3800);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  setConfirm: (confirmReq) => set({ confirmReq }),
  openForm: (form) => set({ form }),
  closeForm: () => set({ form: null }),
  openDeal: (dealPanelId) => set({ dealPanelId }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
  setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
}));

export const toast = {
  success: (title: string, description?: string) => useUI.getState().pushToast({ title, description, tone: "success" }),
  error: (title: string, description?: string) => useUI.getState().pushToast({ title, description, tone: "error" }),
  info: (title: string, description?: string) => useUI.getState().pushToast({ title, description, tone: "info" }),
};

/** Promise-based confirmation dialog. */
export const confirmDialog = (opts: Omit<ConfirmRequest, "resolve">) =>
  new Promise<boolean>((resolve) => useUI.getState().setConfirm({ ...opts, resolve }));

export const openForm = (kind: EntityKind, opts: Omit<FormRequest, "kind"> = {}) => useUI.getState().openForm({ kind, ...opts });
export const openDeal = (id: ID) => useUI.getState().openDeal(id);
