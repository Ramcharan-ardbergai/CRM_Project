"use client";

import { AlertCircle, CalendarCheck, CheckCircle2, CheckSquare, Clock, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { dueState, TaskRow } from "@/components/crm/shared";
import { Button, Card, EmptyState, IconTile, Input, PageHeader, Segmented, Select, Tabs } from "@/components/ui/primitives";
import { PRIORITIES } from "@/lib/constants";
import { useDebounced } from "@/lib/hooks";
import { useCRM, useMeId } from "@/lib/store";
import type { Task } from "@/lib/types";
import { openForm } from "@/lib/ui-store";

type Filter = "all" | "today" | "upcoming" | "overdue" | "completed";

const GROUPS: { id: ReturnType<typeof dueState>[]; label: string }[] = [
  { id: ["overdue"], label: "Overdue" },
  { id: ["today"], label: "Today" },
  { id: ["soon", "later"], label: "Upcoming" },
  { id: ["done"], label: "Completed" },
];

export default function TasksPage() {
  const me = useMeId();
  const tasks = useCRM((s) => s.tasks);
  const users = useCRM((s) => s.users);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [filter, setFilter] = useState<Filter>("all");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [q, setQ] = useState("");
  const query = useDebounced(q).trim().toLowerCase();

  const scoped = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (scope === "all" || t.assigneeId === me) &&
          (scope === "mine" || !assignee || t.assigneeId === assignee) &&
          (!priority || t.priority === priority) &&
          (!query || t.title.toLowerCase().includes(query)),
      ),
    [tasks, scope, me, assignee, priority, query],
  );

  const by = (states: string[]) => scoped.filter((t) => states.includes(dueState(t)));
  const counts = {
    all: scoped.length,
    today: by(["today"]).length,
    upcoming: by(["soon", "later"]).length,
    overdue: by(["overdue"]).length,
    completed: by(["done"]).length,
  };

  const visible = filter === "all" ? scoped : by({ today: ["today"], upcoming: ["soon", "later"], overdue: ["overdue"], completed: ["done"] }[filter]);
  const sortTasks = (xs: Task[]) =>
    [...xs].sort((a, b) =>
      a.status === "done" && b.status === "done"
        ? (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
        : a.dueDate.localeCompare(b.dueDate) || PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority),
    );

  const doneThisWeek = scoped.filter((t) => t.completedAt && Date.now() - new Date(t.completedAt).getTime() < 7 * 86_400_000).length;

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Stay on top of every follow-up."
        actions={
          <>
            <Segmented value={scope} onChange={setScope} options={[{ id: "mine", label: "My tasks" }, { id: "all", label: "All tasks" }]} />
            <Button variant="primary" icon={Plus} onClick={() => openForm("task")}>New task</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Overdue", value: counts.overdue, icon: AlertCircle, tone: "red" as const, f: "overdue" as Filter },
          { label: "Due today", value: counts.today, icon: Clock, tone: "amber" as const, f: "today" as Filter },
          { label: "Upcoming", value: counts.upcoming, icon: CalendarCheck, tone: "blue" as const, f: "upcoming" as Filter },
          { label: "Done this week", value: doneThisWeek, icon: CheckCircle2, tone: "green" as const, f: "completed" as Filter },
        ].map((s) => (
          <button key={s.label} onClick={() => setFilter(s.f)} className="text-left">
            <Card className={`flex items-center gap-3 p-4 transition-all hover:border-line-strong ${filter === s.f ? "ring-2 ring-primary/40" : ""}`}>
              <IconTile icon={s.icon} tone={s.tone} />
              <div>
                <p className="text-xs text-muted">{s.label}</p>
                <p className="text-xl font-semibold text-fg">{s.value}</p>
              </div>
            </Card>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <Tabs
          className="px-3"
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: "all", label: "All", count: counts.all },
            { id: "today", label: "Today", count: counts.today },
            { id: "upcoming", label: "Upcoming", count: counts.upcoming },
            { id: "overdue", label: "Overdue", count: counts.overdue },
            { id: "completed", label: "Completed", count: counts.completed },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="pl-9" />
          </div>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-auto">
            <option value="">Any priority</option>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </Select>
          {scope === "all" && (
            <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-auto">
              <option value="">All assignees</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          )}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={filter === "overdue" ? "Nothing overdue 🎉" : "No tasks here"}
            description="Create a task to plan your next follow-up."
            action={<Button variant="primary" icon={Plus} onClick={() => openForm("task")}>New task</Button>}
          />
        ) : filter === "all" ? (
          GROUPS.map((g) => {
            const items = sortTasks(visible.filter((t) => g.id.includes(dueState(t))));
            if (!items.length) return null;
            return (
              <div key={g.label}>
                <p className="border-b border-line bg-surface-2/60 px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase">
                  {g.label} <span className="text-subtle">· {items.length}</span>
                </p>
                <div className="divide-y divide-line">{items.map((t) => <TaskRow key={t.id} task={t} showAssignee={scope === "all"} />)}</div>
              </div>
            );
          })
        ) : (
          <div className="divide-y divide-line">{sortTasks(visible).map((t) => <TaskRow key={t.id} task={t} showAssignee={scope === "all"} />)}</div>
        )}
      </Card>
    </>
  );
}
