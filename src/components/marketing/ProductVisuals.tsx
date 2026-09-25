"use client";

import { ArrowUpRight, Building2, Check, CheckSquare, Mail, MessageSquareText, MoreHorizontal, Phone, Sparkles, Target, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const avatar = (initials: string, color: string) => (
  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ring-2 ring-white" style={{ background: color }}>
    {initials}
  </span>
);

function AnimatedMetric({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const elementRef = useRef<HTMLParagraphElement>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }

    let animationFrame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const startedAt = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - startedAt) / 720, 1);
        setDisplayValue(value * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }, { threshold: 0.45 });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [value]);

  return <p ref={elementRef} aria-label={`${prefix}${value.toFixed(decimals)}${suffix}`} className="mt-1 text-sm font-semibold tracking-tight text-[#12172c] tabular-nums sm:text-base">{prefix}{displayValue.toFixed(decimals)}{suffix}</p>;
}

export function DashboardPreview({ compact = false, showInsights = true, animateMetrics = false }: { compact?: boolean; showInsights?: boolean; animateMetrics?: boolean }) {
  return (
    <div className={cn("product-stage relative mx-auto w-full min-w-0 max-w-full", compact ? "sm:max-w-[620px]" : "sm:max-w-[1080px]")} aria-label="FocusCRM dashboard preview">
      <div className="product-glow" aria-hidden="true" />
      <div className="product-window relative w-full min-w-0 max-w-full overflow-hidden rounded-[22px] border border-white/70 bg-[#f8f9fc] shadow-[0_40px_100px_-34px_rgba(20,28,75,.5),0_8px_30px_-12px_rgba(18,25,60,.18)]">
        <div className="flex h-10 items-center gap-2 border-b border-[#e9eaf1] bg-white/90 px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f6c85f]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#61c78b]" />
          <span className="mx-auto h-5 w-40 rounded-md bg-[#f1f2f7]" />
        </div>
        <div className="flex min-h-[420px] sm:min-h-[500px]">
          <aside className="hidden w-[168px] shrink-0 border-r border-[#e9eaf1] bg-white px-3 py-4 sm:block">
            <div className="mb-6 flex items-center gap-2 px-2">
              <span className="brand-mark flex h-7 w-7 items-center justify-center rounded-lg text-white"><Target className="h-3.5 w-3.5" /></span>
              <span className="text-[11px] font-bold tracking-tight text-[#151a35]">Focus<span className="text-[#4054e8]">CRM</span></span>
            </div>
            {["Overview", "Contacts", "Companies", "Deals", "Pipeline", "Activities", "Reports"].map((item, i) => (
              <div key={item} className={cn("mb-1 flex h-8 items-center gap-2 rounded-lg px-2 text-[10px] font-medium", i === 0 ? "bg-[#eef0ff] text-[#4054e8]" : "text-[#7a8092]")}>
                <span className={cn("h-3.5 w-3.5 rounded-[4px] border", i === 0 ? "border-[#4054e8]/30 bg-[#4054e8]/10" : "border-[#d9dce6]")} />
                {item}
              </div>
            ))}
          </aside>
          <div className="min-w-0 flex-1 p-3 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#8b90a0]">Thursday, 25 September</p>
                <p className="mt-0.5 text-sm font-semibold tracking-tight text-[#12172c] sm:text-base">Good morning, Maya</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden h-7 w-32 rounded-lg border border-[#e5e7ef] bg-white sm:block" />
                {avatar("MM", "#4054e8")}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Pipeline", value: 1.84, prefix: "$", suffix: "M", decimals: 2, trend: "+18.4%", color: "#4054e8" },
                { label: "Won revenue", value: 428, prefix: "$", suffix: "K", decimals: 0, trend: "+12.7%", color: "#15803d" },
                { label: "Active deals", value: 64, prefix: "", suffix: "", decimals: 0, trend: "+8.2%", color: "#7c5cf0" },
                { label: "Win rate", value: 42.8, prefix: "", suffix: "%", decimals: 1, trend: "+3.1%", color: "#0e7f9a" },
              ].map(({ label, value, prefix, suffix, decimals, trend, color }) => (
                <div key={label} className="dashboard-metric rounded-xl border border-[#e8eaf1] bg-white p-2.5 shadow-[0_2px_8px_rgba(20,25,55,.03)] sm:p-3">
                  <div className="flex items-center justify-between"><p className="text-[9px] text-[#858b9c]">{label}</p><span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} /></div>
                  {animateMetrics
                    ? <AnimatedMetric value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
                    : <p className="mt-1 text-sm font-semibold tracking-tight text-[#12172c] tabular-nums sm:text-base">{prefix}{value.toFixed(decimals)}{suffix}</p>}
                  <p className="mt-1 text-[8px] font-semibold text-[#15803d]">↗ {trend}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 grid gap-2 lg:grid-cols-[1.55fr_.85fr]">
              <div className="rounded-xl border border-[#e8eaf1] bg-white p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-[11px] font-semibold text-[#1b2038]">Revenue momentum</p><p className="text-[8px] text-[#8b90a0]">Closed-won · last 12 months</p></div>
                  <span className="rounded-md bg-[#f3f4f8] px-2 py-1 text-[8px] text-[#676d80]">$428,200</span>
                </div>
                <svg viewBox="0 0 520 170" className="mt-2 h-[112px] w-full sm:h-[145px]" role="img" aria-label="Revenue chart rising over twelve months">
                  <defs><linearGradient id="hero-chart" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4054e8" stopOpacity=".24"/><stop offset="1" stopColor="#4054e8" stopOpacity="0"/></linearGradient></defs>
                  {[30, 70, 110, 150].map((y) => <line key={y} x1="0" x2="520" y1={y} y2={y} stroke="#eef0f5" strokeDasharray="4 5" />)}
                  <path d="M0 145 C35 142 47 128 78 130 S125 105 157 111 S205 84 242 91 S292 75 323 78 S371 48 404 58 S461 25 520 28 L520 170 L0 170Z" fill="url(#hero-chart)" className="chart-area" />
                  <path d="M0 145 C35 142 47 128 78 130 S125 105 157 111 S205 84 242 91 S292 75 323 78 S371 48 404 58 S461 25 520 28" fill="none" stroke="#4054e8" strokeWidth="4" strokeLinecap="round" className="chart-line" />
                </svg>
              </div>
              <div className="rounded-xl border border-[#e8eaf1] bg-white p-3 sm:p-4">
                <div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-[#1b2038]">Next actions</p><span className="text-[8px] text-[#4054e8]">View all</span></div>
                <div className="mt-2 space-y-1.5">
                  {[
                    ["Review Acme proposal", "Today · 10:30", true],
                    ["Call Olivia at Northstar", "Today · 14:00", false],
                    ["Prepare Q4 renewal", "Tomorrow", false],
                    ["Send onboarding brief", "Friday", false],
                  ].map(([task, date, done]) => (
                    <div key={String(task)} className="dashboard-activity flex items-center gap-2 rounded-lg bg-[#f8f9fc] p-2">
                      <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", done ? "border-[#4054e8] bg-[#4054e8] text-white" : "border-[#d8dbe5]")}>{done && <Check className="h-2.5 w-2.5" />}</span>
                      <div className="min-w-0 flex-1"><p className={cn("truncate text-[8px] font-medium text-[#30364d]", done && "line-through opacity-50")}>{task}</p><p className="text-[7px] text-[#9aa0b0]">{date}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {!compact && (
              <div className="mt-2 grid grid-cols-5 gap-1.5 rounded-xl border border-[#e8eaf1] bg-white p-3">
                {["New lead", "Contacted", "Qualified", "Proposal", "Negotiation"].map((stage, i) => (
                  <div key={stage} className="min-w-0"><div className="mb-1 h-1 rounded-full" style={{ background: ["#a1a7b5", "#0ea5c6", "#7c5cf0", "#4054e8", "#e08a00"][i] }} /><p className="truncate text-[7px] text-[#8b90a0]">{stage}</p><p className="text-[9px] font-semibold text-[#20263e]">{[12, 9, 15, 8, 6][i]} deals</p></div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {showInsights && (
        <>
          <div className="floating-insight floating-insight-left hidden items-center gap-2 rounded-xl border border-white/70 bg-white/95 p-2.5 shadow-[0_18px_45px_-18px_rgba(16,22,60,.3)] md:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f7ee] text-[#15803d]"><ArrowUpRight className="h-4 w-4" /></span>
            <div><p className="text-[10px] text-[#7d8394]">Pipeline velocity</p><p className="text-xs font-semibold text-[#151a31]">+18.4% this month</p></div>
          </div>
          <div className="floating-insight floating-insight-right hidden items-center gap-2 rounded-xl border border-white/70 bg-white/95 p-2.5 shadow-[0_18px_45px_-18px_rgba(16,22,60,.3)] md:flex">
            {avatar("ON", "#7c5cf0")}
            <div><p className="text-[10px] text-[#7d8394]">Deal moved to proposal</p><p className="text-xs font-semibold text-[#151a31]">Northstar expansion</p></div>
          </div>
        </>
      )}
    </div>
  );
}

export function PipelinePreview() {
  const columns = [
    { name: "Qualified", color: "#7c5cf0", value: "$420K", cards: [["Acme expansion", "$180K", "AM"], ["Horizon Cloud", "$96K", "JK"]] },
    { name: "Proposal", color: "#4054e8", value: "$355K", cards: [["Northstar rollout", "$210K", "ON"], ["Vertex renewal", "$74K", "MC"]] },
    { name: "Negotiation", color: "#e08a00", value: "$280K", cards: [["Atlas enterprise", "$280K", "RD"]] },
    { name: "Won", color: "#16a34a", value: "$196K", cards: [["Solace onboarding", "$128K", "SV"], ["Alpine team", "$68K", "LG"]] },
  ];
  return (
    <div className="grid min-w-[720px] grid-cols-4 gap-3" aria-label="Sales pipeline preview">
      {columns.map((column, ci) => (
        <div key={column.name} className="rounded-2xl border border-white/10 bg-white/[.055] p-3 backdrop-blur">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: column.color }} /><span className="text-xs font-semibold text-white">{column.name}</span><span className="ml-auto text-[10px] text-white/45">{column.cards.length}</span></div>
          <p className="mt-1 text-[10px] text-white/45">{column.value}</p>
          <div className="mt-3 space-y-2">
            {column.cards.map(([name, value, owner], i) => (
              <div key={name} className="pipeline-demo-card rounded-xl border border-white/10 bg-[#171d40] p-3 shadow-xl" style={{ animationDelay: `${ci * 90 + i * 70}ms` }}>
                <div className="flex items-start justify-between"><p className="text-[11px] font-medium text-white">{name}</p><MoreHorizontal className="h-3.5 w-3.5 text-white/35" /></div>
                <p className="mt-2 text-sm font-semibold text-white">{value}</p>
                <div className="mt-3 flex items-center justify-between"><span className="rounded-full bg-white/[.07] px-2 py-0.5 text-[8px] text-white/55">Oct 18</span>{avatar(owner, column.color)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CustomerPreview() {
  return (
    <div className="relative rounded-[24px] border border-[#e4e6ee] bg-white p-4 shadow-[0_24px_70px_-32px_rgba(20,28,70,.38)] sm:p-5">
      <div className="flex items-center gap-3 border-b border-[#eceef3] pb-4">
        {avatar("OM", "#4054e8")}
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#14192f]">Olivia Martin</p><p className="text-[10px] text-[#818797]">VP Operations · Northstar Labs</p></div>
        <span className="rounded-full bg-[#e8f7ee] px-2 py-1 text-[9px] font-semibold text-[#15803d]">Customer</span>
      </div>
      <div className="grid gap-4 pt-4 sm:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-2">
          {[Mail, Phone, Building2].map((Icon, i) => <div key={i} className="flex items-center gap-2 rounded-lg bg-[#f7f8fb] p-2 text-[9px] text-[#5d6477]"><Icon className="h-3.5 w-3.5 text-[#8e94a5]" />{["olivia@northstar.io", "+1 415 555 0148", "Northstar Labs"][i]}</div>)}
          <div className="rounded-xl bg-[#111831] p-3 text-white"><p className="text-[9px] text-white/50">Open opportunity</p><p className="mt-1 text-sm font-semibold">$210,000</p><p className="mt-2 text-[9px] text-[#9ca8ff]">Proposal · 60%</p></div>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[#2a3047]">Relationship timeline</p>
          <div className="relative mt-3 space-y-3 before:absolute before:top-3 before:bottom-3 before:left-3 before:w-px before:bg-[#e2e5ed]">
            {[
              [MessageSquareText, "Proposal feedback received", "12 minutes ago", "#4054e8"],
              [Phone, "Discovery call completed", "Yesterday · 32 min", "#16a34a"],
              [CheckSquare, "Security review assigned", "Due tomorrow", "#e08a00"],
              [Users, "Stakeholders added", "4 days ago", "#7c5cf0"],
            ].map(([Icon, text, meta, color]) => {
              const TimelineIcon = Icon as typeof Phone;
              return <div key={String(text)} className="relative flex gap-3"><span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#e0e3eb]"><TimelineIcon className="h-3 w-3" style={{ color: String(color) }} /></span><div><p className="text-[10px] font-medium text-[#32384d]">{String(text)}</p><p className="text-[8px] text-[#969bab]">{String(meta)}</p></div></div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RelationshipMap() {
  const nodes = [
    { label: "Contacts", icon: Users, pos: "left-[3%] top-[16%]", color: "#4054e8" },
    { label: "Companies", icon: Building2, pos: "right-[2%] top-[16%]", color: "#7c5cf0" },
    { label: "Deals", icon: Target, pos: "left-[7%] bottom-[12%]", color: "#e08a00" },
    { label: "Activity", icon: MessageSquareText, pos: "right-[5%] bottom-[12%]", color: "#0e8ca8" },
  ];
  return (
    <div className="relative mx-auto aspect-[1.25] w-full max-w-[470px]" aria-label="Connected customer relationship map">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 470 376" aria-hidden="true">
        <defs><linearGradient id="rel-line"><stop stopColor="#4054e8" stopOpacity=".12"/><stop offset=".5" stopColor="#4054e8" stopOpacity=".65"/><stop offset="1" stopColor="#7c5cf0" stopOpacity=".12"/></linearGradient></defs>
        <path d="M235 188 L75 78 M235 188 L395 78 M235 188 L82 306 M235 188 L390 306" stroke="url(#rel-line)" strokeWidth="2" strokeDasharray="6 8" className="relationship-lines" />
        <circle cx="235" cy="188" r="88" fill="none" stroke="#4054e8" strokeOpacity=".09" />
        <circle cx="235" cy="188" r="120" fill="none" stroke="#4054e8" strokeOpacity=".06" />
      </svg>
      <div className="absolute inset-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[#4054e8]/20 bg-white shadow-[0_20px_60px_-24px_rgba(64,84,232,.55)]">
        <span className="brand-mark flex h-10 w-10 items-center justify-center rounded-xl text-white"><Sparkles className="h-5 w-5" /></span><p className="mt-2 text-xs font-semibold text-[#1a2038]">One clear view</p>
      </div>
      {nodes.map((node) => <div key={node.label} className={cn("relationship-node absolute flex w-28 flex-col items-center rounded-2xl border border-[#e4e7ef] bg-white p-3 shadow-[0_16px_45px_-25px_rgba(20,28,70,.4)]", node.pos)}><span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: node.color }}><node.icon className="h-4 w-4" /></span><p className="mt-1.5 text-[10px] font-semibold text-[#2a3048]">{node.label}</p></div>)}
    </div>
  );
}
