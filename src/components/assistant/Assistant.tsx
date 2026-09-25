"use client";

import { ArrowUp, RotateCcw, Sparkles, Square, X } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { buildContext, localAnswer } from "@/lib/assistant";
import { useData } from "@/lib/hooks";
import { useCRM, useMe } from "@/lib/store";
import { openDeal, useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "../ui/primitives";

interface Msg {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const SUGGESTIONS = [
  "What should the team focus on today?",
  "Summarise the sales pipeline",
  "Which deals are past their close date?",
  "Any urgent support tickets?",
  "Who are our top customers?",
  "Draft a follow-up email for our biggest open deal",
];

/* ---------- tiny Markdown renderer (bold, code, links, lists, headings) ---------- */
function inline(text: string, onNavigate: () => void): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|_[^_]+_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={i++} className="font-semibold text-fg">{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={i++} className="rounded bg-surface-3 px-1 text-[12px]">{t.slice(1, -1)}</code>);
    else if (t.startsWith("_")) out.push(<em key={i++}>{t.slice(1, -1)}</em>);
    else {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      if (href!.startsWith("deal:")) {
        out.push(
          <button key={i++} onClick={() => openDeal(href!.slice(5))} className="font-medium text-primary hover:underline">
            {label}
          </button>,
        );
      } else if (href!.startsWith("/")) {
        out.push(<Link key={i++} href={href!} onClick={onNavigate} className="font-medium text-primary hover:underline">{label}</Link>);
      } else {
        out.push(<a key={i++} href={href} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{label}</a>);
      }
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Markdown({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={cn("space-y-1 pl-5", list.ordered ? "list-decimal" : "list-disc")}>
        {list.items.map((it, j) => <li key={j}>{inline(it, onNavigate)}</li>)}
      </Tag>,
    );
    list = null;
  };
  text.split("\n").forEach((raw) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]!);
      return;
    }
    flush();
    if (!line.trim()) return;
    const h = line.match(/^#{1,4}\s+(.*)$/);
    if (h) blocks.push(<p key={blocks.length} className="pt-1 font-semibold text-fg">{inline(h[1]!, onNavigate)}</p>);
    else blocks.push(<p key={blocks.length}>{inline(line, onNavigate)}</p>);
  });
  flush();
  return <div className="space-y-2">{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}

export function AssistantButton() {
  const setOpen = useUI((s) => s.setAssistantOpen);
  const open = useUI((s) => s.assistantOpen);
  if (open) return null;
  return (
    <button
      onClick={() => setOpen(true)}
      aria-label="Open AI assistant"
      className="fixed right-5 bottom-5 z-40 flex h-12 items-center gap-2 rounded-full bg-gradient-to-br from-[#5b6cff] to-[#3a45d6] px-4 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5 active:scale-95"
    >
      <Sparkles className="h-[18px] w-[18px]" />
      <span className="hidden sm:inline">Ask AI</span>
    </button>
  );
}

export function AssistantPanel() {
  const open = useUI((s) => s.assistantOpen);
  const setOpen = useUI((s) => s.setAssistantOpen);
  const data = useData();
  const currency = useCRM((s) => s.settings.currency);
  const me = useMe();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, setOpen]);

  const close = () => setOpen(false);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    const history: Msg[] = [...msgs.filter((m) => !m.error), { role: "user", content: q }];
    setMsgs([...history, { role: "assistant", content: "" }]);

    if (offline) {
      setMsgs([...history, { role: "assistant", content: localAnswer(q, data, currency) }]);
      return;
    }

    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let text = "";
    const put = (content: string, error = false) => setMsgs([...history, { role: "assistant", content, error }]);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })), context: buildContext(data, currency, me) }),
        signal: ctrl.signal,
      });
      if (res.status === 503) throw new Error("__not_configured__");
      if (!res.ok || !res.body) throw new Error("The assistant is unavailable right now.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const errAt = text.indexOf("\u0000");
        if (errAt >= 0) throw new Error(text.slice(errAt + 1));
        put(text);
      }
      if (!text.trim()) put("I didn't get a response. Please try again.", true);
    } catch (e) {
      const message = (e as Error).message;
      if ((e as Error).name === "AbortError") put(text || "_Stopped._");
      else if (message === "__not_configured__") {
        // No API credentials on the server: switch to rule-based answers.
        setOffline(true);
        put(`${localAnswer(q, data, currency)}\n\n_Offline mode: no Anthropic API key is configured on the server._`);
      } else put(message, true);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#0b0f1a]/20 sm:hidden" onClick={close} />
      <aside
        role="dialog"
        aria-label="AI assistant"
        className="fixed inset-y-0 right-0 z-50 flex w-full animate-slide-in flex-col border-l border-line bg-surface shadow-pop sm:w-[420px]"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#5b6cff] to-[#3a45d6] text-white">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">Focus AI</p>
            <p className="text-xs text-muted">{offline ? "Offline mode · basic answers" : "Answers from your live CRM data"}</p>
          </div>
          {msgs.length > 0 && <Button variant="ghost" size="icon-sm" icon={RotateCcw} onClick={() => setMsgs([])} aria-label="New conversation" title="New conversation" />}
          <Button variant="ghost" size="icon-sm" icon={X} onClick={close} aria-label="Close assistant" />
        </div>

        <div ref={scrollRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {msgs.length === 0 && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-primary-soft/60 p-4 text-sm text-fg-2">
                <p className="font-semibold text-fg">Hi {me.name.split(" ")[0]}, ask me anything about your CRM.</p>
                <p className="mt-1">I can summarise the pipeline, find at-risk deals, list what's overdue, explain a customer's history or draft follow-up emails.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-left text-[13px] text-fg-2 transition-colors hover:border-primary/50 hover:text-primary">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-fg">{m.content}</p>
              </div>
            ) : (
              <div key={i} className="flex gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className={cn("min-w-0 flex-1 text-sm leading-relaxed text-fg-2", m.error && "text-tone-red")}>
                  {m.content ? (
                    <Markdown text={m.content} onNavigate={() => window.innerWidth < 640 && close()} />
                  ) : (
                    <span className="inline-flex gap-1 pt-2" aria-label="Thinking">
                      {[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" style={{ animationDelay: `${d * 150}ms` }} />)}
                    </span>
                  )}
                </div>
              </div>
            ),
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="border-t border-line p-3"
        >
          <div className="flex items-end gap-2 rounded-xl border border-line bg-surface-2/50 p-2 focus-within:border-primary focus-within:ring-4 focus-within:ring-[var(--ring)]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              rows={1}
              placeholder="Ask about deals, customers, tasks…"
              className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-1.5 py-1.5 text-sm text-fg outline-none placeholder:text-subtle"
            />
            {busy ? (
              <Button type="button" size="icon" icon={Square} onClick={() => abortRef.current?.abort()} aria-label="Stop" />
            ) : (
              <Button type="submit" variant="primary" size="icon" icon={ArrowUp} disabled={!input.trim()} aria-label="Send" />
            )}
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-subtle">Enter to send · Shift+Enter for a new line · Answers can be wrong, so check key figures.</p>
        </form>
      </aside>
    </>
  );
}
