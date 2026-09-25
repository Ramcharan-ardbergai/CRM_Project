"use client";

import { useState } from "react";
import { useCRM, useMeId } from "@/lib/store";
import type { Relations } from "@/lib/types";
import { toast } from "@/lib/ui-store";
import { Button, Textarea } from "../ui/primitives";

/** Inline composer that saves a note (or ticket reply) as an activity. */
export function NoteComposer({ rel, placeholder = "Write a note…", subject = "Note", cta = "Add note" }: { rel: Relations; placeholder?: string; subject?: string; cta?: string }) {
  const add = useCRM((s) => s.add);
  const me = useMeId();
  const [text, setText] = useState("");

  const save = () => {
    if (!text.trim()) return;
    const now = new Date().toISOString();
    add("activities", {
      type: "note",
      subject,
      description: text.trim(),
      date: now,
      status: "completed",
      ownerId: me,
      contactId: rel.contactId ?? null,
      companyId: rel.companyId ?? null,
      dealId: rel.dealId ?? null,
      ticketId: rel.ticketId ?? null,
    });
    setText("");
    toast.success(`${subject} added`);
  };

  return (
    <div className="rounded-xl border border-line bg-surface-2/50 p-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-[var(--ring)]">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && save()}
        placeholder={placeholder}
        className="min-h-[72px] border-0 bg-transparent p-0 shadow-none focus:ring-0 hover:border-0"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-subtle">Ctrl + Enter to save</span>
        <Button size="sm" variant="primary" onClick={save} disabled={!text.trim()}>{cta}</Button>
      </div>
    </div>
  );
}
