"use client";

import { Building2, Calendar, CheckSquare, Flag, Handshake, Pencil, Percent, Trash2, Trophy, User, X, XCircle, Zap } from "lucide-react";
import { useMemo } from "react";
import { STAGES } from "@/lib/constants";
import { useMoney } from "@/lib/hooks";
import { useCRM } from "@/lib/store";
import { openForm, toast, useUI } from "@/lib/ui-store";
import { cn, formatDate } from "@/lib/utils";
import { Drawer } from "../ui/overlay";
import { Button, Tabs } from "../ui/primitives";
import { CompanyLink, ContactLink, deleteRecord, ExtraFields, InfoRow, OwnerCell, PriorityBadge, StageBadge, TaskRow, Timeline } from "./shared";
import { useState } from "react";

export function DealDrawer() {
  const id = useUI((s) => s.dealPanelId);
  const close = () => useUI.getState().openDeal(null);
  return (
    <Drawer open={!!id} onClose={close}>
      {id && <DealPanel key={id} id={id} onClose={close} />}
    </Drawer>
  );
}

function DealPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const deal = useCRM((s) => s.deals.find((d) => d.id === id));
  const allTasks = useCRM((s) => s.tasks);
  const moveDeal = useCRM((s) => s.moveDeal);
  const money = useMoney();
  const [tab, setTab] = useState<"timeline" | "tasks">("timeline");
  const tasks = useMemo(() => allTasks.filter((t) => t.dealId === id), [allTasks, id]);

  if (!deal) {
    return <div className="p-6 text-sm text-muted">This deal no longer exists.</div>;
  }

  const stageIndex = STAGES.findIndex((s) => s.id === deal.stage);
  const move = (stage: (typeof STAGES)[number]["id"]) => {
    moveDeal(deal.id, stage);
    toast.success(`Moved to ${STAGES.find((s) => s.id === stage)!.label}`, deal.name);
  };
  const rel = { dealId: deal.id, companyId: deal.companyId, contactId: deal.contactId };

  return (
    <>
      <div className="border-b border-line px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="tone-blue flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <Handshake className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-fg">{deal.name}</h2>
              <p className="text-sm text-muted">
                <CompanyLink id={deal.companyId} />
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" icon={Pencil} onClick={() => openForm("deal", { id: deal.id })} aria-label="Edit deal" />
            <Button variant="ghost" size="icon-sm" icon={Trash2} onClick={() => deleteRecord("deal", deal.id, deal.name, onClose)} aria-label="Delete deal" />
            <Button variant="ghost" size="icon-sm" icon={X} onClick={onClose} aria-label="Close" />
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-xs text-muted">Deal value</p>
            <p className="text-2xl font-semibold tracking-tight text-fg">{money.full(deal.amount)}</p>
          </div>
          <StageBadge stage={deal.stage} />
        </div>

        {/* Stage stepper */}
        <div className="mt-4 flex gap-1">
          {STAGES.filter((s) => s.id !== "lost").map((s, i) => {
            const reached = deal.stage !== "lost" && i <= stageIndex;
            return (
              <button
                key={s.id}
                onClick={() => move(s.id)}
                title={`Move to ${s.label}`}
                className="group flex-1"
              >
                <span className={cn("block h-1.5 rounded-full transition-colors", reached ? "" : "bg-surface-3 group-hover:bg-line-strong")} style={reached ? { background: s.color } : undefined} />
                <span className={cn("mt-1.5 block truncate text-[10px] font-medium", s.id === deal.stage ? "text-fg" : "text-subtle group-hover:text-fg-2")}>{s.label}</span>
              </button>
            );
          })}
        </div>
        {deal.stage !== "won" && deal.stage !== "lost" && (
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="primary" icon={Trophy} onClick={() => move("won")} className="flex-1 bg-[var(--green)] shadow-none hover:bg-[var(--green)] hover:opacity-90">Mark won</Button>
            <Button size="sm" icon={XCircle} onClick={() => move("lost")} className="flex-1">Mark lost</Button>
          </div>
        )}
        {(deal.stage === "won" || deal.stage === "lost") && (
          <Button size="sm" className="mt-4 w-full" onClick={() => move("negotiation")}>Reopen deal</Button>
        )}
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-x-4 border-b border-line px-6 py-4">
          <InfoRow icon={User} label="Contact"><ContactLink id={deal.contactId} /></InfoRow>
          <InfoRow icon={Building2} label="Company"><CompanyLink id={deal.companyId} /></InfoRow>
          <InfoRow icon={Calendar} label="Expected close">{formatDate(deal.closeDate)}</InfoRow>
          <InfoRow icon={Percent} label="Probability">{deal.probability}% · {money.compact((deal.amount * deal.probability) / 100)} weighted</InfoRow>
          <InfoRow icon={Flag} label="Priority"><PriorityBadge priority={deal.priority} /></InfoRow>
          <InfoRow icon={User} label="Owner"><OwnerCell userId={deal.ownerId} /></InfoRow>
          <ExtraFields extra={deal.extra} className="col-span-2 border-t border-line" />
        </div>

        <div className="flex gap-2 px-6 pt-4">
          <Button size="sm" icon={Zap} onClick={() => openForm("activity", { defaults: rel })}>Log activity</Button>
          <Button size="sm" icon={CheckSquare} onClick={() => openForm("task", { defaults: { ...rel, title: `Follow up: ${deal.name}` } })}>Add task</Button>
        </div>

        <div className="px-6">
          <Tabs
            className="mt-3"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "timeline", label: "Timeline" },
              { id: "tasks", label: "Tasks", count: tasks.filter((t) => t.status === "todo").length },
            ]}
          />
          <div className="py-5">
            {tab === "timeline" ? (
              <Timeline rel={{ dealId: deal.id }} />
            ) : tasks.length ? (
              <div className="divide-y divide-line">
                {tasks.map((t) => <TaskRow key={t.id} task={t} compact />)}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted">No tasks for this deal yet.</p>
            )}
          </div>
        </div>
        <p className="px-6 pb-6 text-xs text-subtle">Created {formatDate(deal.createdAt)}{deal.closedAt && ` · Closed ${formatDate(deal.closedAt)}`}</p>
      </div>
    </>
  );
}
