"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { ActivityItem, TaskRow } from "@/components/crm/shared";
import { Button, Card, CardHeader, PageHeader, Segmented } from "@/components/ui/primitives";
import { ACTIVITY_MAP } from "@/lib/constants";
import { useCRM, useMeId } from "@/lib/store";
import { openForm } from "@/lib/ui-store";
import { cn, dayLabel, formatDate, formatTime, isSameDay, startOfDay, toDateInput } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const me = useMeId();
  const activities = useCRM((s) => s.activities);
  const tasks = useCRM((s) => s.tasks);
  const [scope, setScope] = useState<"mine" | "team">("mine");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(() => startOfDay());

  const days = useMemo(() => {
    const offset = (cursor.getDay() + 6) % 7; // Monday-first
    const start = new Date(cursor);
    start.setDate(1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const myActs = useMemo(() => activities.filter((a) => scope === "team" || a.ownerId === me), [activities, scope, me]);
  const myTasks = useMemo(() => tasks.filter((t) => scope === "team" || t.assigneeId === me), [tasks, scope, me]);
  const itemsOn = (d: Date) => ({
    acts: myActs.filter((a) => isSameDay(a.date, d)).sort((a, b) => a.date.localeCompare(b.date)),
    tasks: myTasks.filter((t) => isSameDay(t.dueDate, d)),
  });
  const sel = itemsOn(selected);
  const shift = (m: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + m, 1));

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Meetings, calls and task due dates at a glance."
        actions={
          <>
            <Segmented value={scope} onChange={setScope} options={[{ id: "mine", label: "My calendar" }, { id: "team", label: "Team" }]} />
            <Button variant="primary" icon={Plus} onClick={() => openForm("activity", { defaults: { status: "planned", type: "meeting", date: new Date(selected.getTime() + 10 * 3_600_000).toISOString() } })}>Schedule</Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden xl:col-span-8">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-lg font-semibold text-fg">{cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
            <div className="flex items-center gap-1">
              <Button size="sm" onClick={() => { const t = new Date(); setCursor(new Date(t.getFullYear(), t.getMonth(), 1)); setSelected(startOfDay()); }}>Today</Button>
              <Button size="icon-sm" variant="ghost" icon={ChevronLeft} onClick={() => shift(-1)} aria-label="Previous month" />
              <Button size="icon-sm" variant="ghost" icon={ChevronRight} onClick={() => shift(1)} aria-label="Next month" />
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-line bg-surface-2/60">
            {WEEKDAYS.map((d) => <div key={d} className="py-2 text-center text-xs font-medium text-muted">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d, i) => {
              const { acts, tasks: ts } = itemsOn(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = isSameDay(d, new Date());
              const isSel = isSameDay(d, selected);
              const entries = [
                ...acts.map((a) => ({ id: a.id, label: `${formatTime(a.date)} ${a.subject}`, tone: ACTIVITY_MAP[a.type].tone, done: a.status === "completed" })),
                ...ts.map((t) => ({ id: t.id, label: `✓ ${t.title}`, tone: "gray" as const, done: t.status === "done" })),
              ];
              return (
                <button
                  key={i}
                  onClick={() => setSelected(startOfDay(d))}
                  className={cn(
                    "flex min-h-[64px] flex-col gap-1 border-r border-b border-line p-1.5 text-left transition-colors sm:min-h-[104px] [&:nth-child(7n)]:border-r-0",
                    !inMonth && "bg-surface-2/40",
                    isSel ? "bg-primary-soft/60" : "hover:bg-surface-2/60",
                  )}
                >
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium", isToday ? "bg-primary text-white" : inMonth ? "text-fg" : "text-subtle")}>
                    {d.getDate()}
                  </span>
                  <div className="hidden space-y-0.5 sm:block">
                    {entries.slice(0, 3).map((e) => (
                      <span key={e.id} className={cn(`tone-${e.tone}`, "block truncate rounded px-1.5 py-px text-[11px]", e.done && "opacity-50")}>{e.label}</span>
                    ))}
                    {entries.length > 3 && <span className="block px-1.5 text-[11px] text-muted">+{entries.length - 3} more</span>}
                  </div>
                  {entries.length > 0 && <span className="mx-auto h-1.5 w-1.5 rounded-full bg-primary sm:hidden" />}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="self-start xl:col-span-4">
          <CardHeader
            title={dayLabel(selected.toISOString())}
            subtitle={formatDate(selected.toISOString(), { weekday: "long", day: "numeric", month: "long" })}
            action={
              <div className="flex gap-1">
                <Button size="sm" icon={Plus} onClick={() => openForm("task", { defaults: { dueDate: toDateInput(selected.toISOString()) } })}>Task</Button>
                <Button size="sm" icon={Plus} onClick={() => openForm("activity", { defaults: { status: "planned", date: new Date(selected.getTime() + 10 * 3_600_000).toISOString() } })}>Event</Button>
              </div>
            }
          />
          <div className="px-5 pb-5">
            {sel.acts.length === 0 && sel.tasks.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Nothing on this day.</p>
            ) : (
              <>
                {sel.acts.length > 0 && (
                  <div className="space-y-5">
                    {sel.acts.map((a) => <ActivityItem key={a.id} activity={a} />)}
                  </div>
                )}
                {sel.tasks.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-1 text-xs font-semibold tracking-wide text-subtle uppercase">Tasks due</p>
                    <div className="divide-y divide-line">{sel.tasks.map((t) => <TaskRow key={t.id} task={t} compact />)}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
