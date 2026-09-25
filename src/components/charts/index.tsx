"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCRM } from "@/lib/store";

export function useChartTheme() {
  const dark = useCRM((s) => s.settings.theme === "dark");
  return {
    primary: dark ? "#6475ff" : "#4054e8",
    violet: dark ? "#9d85ff" : "#7c5cf0",
    grid: dark ? "#222838" : "#eceef4",
    axis: dark ? "#727a90" : "#8b92a5",
    cursor: dark ? "rgba(255,255,255,0.04)" : "rgba(64,84,232,0.05)",
  };
}

type Formatter = (v: number) => string;

function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: { name: string; value: number; color?: string; payload?: Record<string, unknown> }[]; label?: string; format?: Formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      {label && <p className="mb-1 font-medium text-muted">{(payload[0]?.payload?.label as string) ?? label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 font-semibold text-fg">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {format ? format(p.value) : p.value.toLocaleString("en-IN")}
          <span className="font-normal text-muted">{p.name}</span>
        </p>
      ))}
    </div>
  );
}

export function Sparkline({ data, color, height = 44 }: { data: number[]; color: string; height?: number }) {
  const id = useId().replace(/:/g, "");
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sp${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#sp${id})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TrendChart<T extends Record<string, unknown>>({ data, xKey, series, height = 280, format, yFormat }: {
  data: T[];
  xKey: keyof T & string;
  series: { key: keyof T & string; name: string; color: string }[];
  height?: number;
  format?: Formatter;
  yFormat?: Formatter;
}) {
  const theme = useChartTheme();
  const id = useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`g${id}${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="4 4" />
        <XAxis dataKey={xKey as never} tickLine={false} axisLine={false} tick={{ fill: theme.axis, fontSize: 12 }} dy={8} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: theme.axis, fontSize: 12 }} tickFormatter={yFormat} width={64} />
        <Tooltip content={<ChartTooltip format={format} />} cursor={{ stroke: theme.axis, strokeDasharray: "4 4" }} />
        {series.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key as never} name={s.name} stroke={s.color} strokeWidth={2.5} fill={`url(#g${id}${s.key})`} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars<T extends Record<string, unknown>>({ data, xKey, series, height = 260, format, yFormat, layout = "horizontal", stacked }: {
  data: T[];
  xKey: keyof T & string;
  series: { key: keyof T & string; name: string; color: string }[];
  height?: number;
  format?: Formatter;
  yFormat?: Formatter;
  layout?: "horizontal" | "vertical";
  stacked?: boolean;
}) {
  const theme = useChartTheme();
  const vertical = layout === "vertical";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={vertical ? 8 : "28%"}>
        <CartesianGrid vertical={vertical} horizontal={!vertical} stroke={theme.grid} strokeDasharray="4 4" />
        {vertical ? (
          <>
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: theme.axis, fontSize: 12 }} tickFormatter={yFormat} />
            <YAxis type="category" dataKey={xKey as never} tickLine={false} axisLine={false} tick={{ fill: theme.axis, fontSize: 12 }} width={96} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey as never} tickLine={false} axisLine={false} tick={{ fill: theme.axis, fontSize: 12 }} dy={8} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: theme.axis, fontSize: 12 }} tickFormatter={yFormat} width={64} />
          </>
        )}
        <Tooltip content={<ChartTooltip format={format} />} cursor={{ fill: theme.cursor }} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key as never}
            name={s.name}
            fill={s.color}
            stackId={stacked ? "a" : undefined}
            radius={stacked && i < series.length - 1 ? 0 : vertical ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            maxBarSize={vertical ? 22 : 36}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 200, center, format }: {
  data: { name: string; value: number; color: string }[];
  height?: number;
  center?: { value: string; label: string };
  format?: Formatter;
}) {
  const nonEmpty = data.filter((d) => d.value > 0);
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltip format={format} />} />
          <Pie data={nonEmpty} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={2} cornerRadius={4} stroke="none">
            {nonEmpty.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {center && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight text-fg">{center.value}</span>
          <span className="text-xs text-muted">{center.label}</span>
        </div>
      )}
    </div>
  );
}

/** Circular progress ring (no chart library needed). */
export function Ring({ value, size = 120, stroke = 10, color, children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: "var(--surface-3)" }} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          style={{ stroke: color ?? "var(--primary)", transition: "stroke-dashoffset 0.6s ease" }}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, value) / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
