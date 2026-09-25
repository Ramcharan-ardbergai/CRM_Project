"use client";

import { ArrowRight, BarChart3, Building2, Check, CheckSquare, CircleDot, ContactRound, Mail, Menu, MessageSquareText, Phone, Target, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FocusBrand } from "./Brand";
import { CustomerPreview, DashboardPreview, PipelinePreview, RelationshipMap } from "./ProductVisuals";

const nav = [
  { label: "Product", href: "#product" },
  { label: "Solutions", href: "#solutions" },
  { label: "Features", href: "#features" },
  { label: "Resources", href: "#resources" },
];

const timeline = [
  { time: "09:10", icon: Mail, title: "Proposal feedback received", detail: "Olivia replied · Northstar Labs", color: "#4054e8" },
  { time: "10:30", icon: Phone, title: "Renewal call", detail: "Atlas Enterprise · 30 minutes", color: "#16a34a" },
  { time: "13:00", icon: CheckSquare, title: "Security review due", detail: "Assigned to Maya", color: "#d97706" },
  { time: "15:40", icon: MessageSquareText, title: "Account note added", detail: "Expansion discussed for Q4", color: "#7c5cf0" },
];

export function MarketingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="marketing-page min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-white text-[#11162e]">
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <nav
          aria-label="Marketing navigation"
          className={cn(
            "mx-auto flex h-14 max-w-7xl items-center border px-3 transition-all duration-300 sm:px-4",
            scrolled || mobileOpen
              ? "rounded-2xl border-[#dde0ea] bg-white/92 shadow-[0_14px_40px_-28px_rgba(15,22,60,.38)] backdrop-blur-xl"
              : "rounded-none border-transparent bg-transparent",
          )}
        >
          <a href="#top" aria-label="FocusCRM home"><FocusBrand /></a>
          <div className="ml-10 hidden items-center gap-1 lg:flex">
            {nav.map((item) => <a key={item.label} href={item.href} className="rounded-lg px-3 py-2 text-[13px] font-medium text-[#5f667b] transition-colors hover:bg-[#f2f3f7] hover:text-[#151a32]">{item.label}</a>)}
          </div>
          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <Link href="/login" className="rounded-lg px-3 py-2 text-[13px] font-semibold text-[#363d55] transition-colors hover:bg-[#f2f3f7]">Sign in</Link>
          </div>
          <button onClick={() => setMobileOpen((value) => !value)} className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-[#343b52] hover:bg-[#f2f3f7] sm:hidden" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {mobileOpen && (
          <div className="mx-auto mt-2 max-w-7xl animate-pop-in rounded-2xl border border-[#dde0ea] bg-white p-3 shadow-[0_24px_60px_-28px_rgba(15,22,60,.4)] sm:hidden">
            {nav.map((item) => <a key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-medium text-[#4f566c] hover:bg-[#f4f5f8]">{item.label}</a>)}
            <div className="mt-2 border-t border-[#e8eaf0] pt-3">
              <Link href="/login" className="flex h-10 w-full items-center justify-center rounded-lg border border-[#dfe2eb] text-sm font-semibold">Sign in</Link>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="relative min-h-screen overflow-hidden pt-28 sm:pt-36" aria-labelledby="hero-heading">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 sm:px-8 lg:grid-cols-[.78fr_1.22fr] lg:gap-8 lg:pb-28">
            <div className="relative z-10 max-w-xl">
              <p className="hero-enter hero-enter-1 flex items-center gap-2 text-xs font-semibold tracking-[.12em] text-[#4054e8] uppercase">
                <span className="h-px w-8 bg-[#4054e8]" /> Clarity for every relationship
              </p>
              <h1 id="hero-heading" className="hero-enter hero-enter-2 mt-6 text-[46px] leading-[.97] font-semibold tracking-[-.055em] text-[#0d1229] sm:text-[56px] lg:text-[62px]">
                Keep every customer <span className="text-[#4054e8]">in focus.</span>
              </h1>
              <p className="hero-enter hero-enter-3 mt-7 max-w-lg text-[15px] leading-7 text-[#626a80] sm:text-[17px] sm:leading-8">
                FocusCRM brings conversations, opportunities, activity and customer context into one clear workspace—so the next move is never buried in the noise.
              </p>
              <div className="hero-enter hero-enter-4 mt-8 flex">
                <a href="#product" className="marketing-primary-button group flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white">Explore the workspace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></a>
              </div>
              <p className="hero-enter hero-enter-5 mt-8 flex items-center gap-2 text-[11px] text-[#858b9c]"><CircleDot className="h-3.5 w-3.5 text-[#4054e8]" /> Contacts, pipeline, activity and reporting—connected.</p>
            </div>

            <div id="product" className="hero-enter hero-enter-5 relative min-w-0 py-4 lg:pl-5">
              <DashboardPreview compact />
            </div>
          </div>
          <div className="mx-auto grid max-w-7xl border-t border-[#e9ebf1] px-5 sm:grid-cols-3 sm:px-8">
            {[
              ["01", "One customer record", "See the account, people, conversations and open work together."],
              ["02", "One visible pipeline", "Know what is moving, what is stuck and who owns the next step."],
              ["03", "One reliable signal", "Turn everyday customer activity into a clear view of performance."],
            ].map(([number, title, text]) => (
              <div key={number} className="border-b border-[#e9ebf1] py-6 sm:border-r sm:border-b-0 sm:px-7 sm:first:pl-0 sm:last:border-r-0">
                <p className="text-[11px] font-semibold tracking-[.15em] text-[#a0a5b3]">{number}</p>
                <p className="mt-3 text-sm font-semibold text-[#22283f]">{title}</p>
                <p className="mt-2 max-w-xs text-[13px] leading-5 text-[#777e91]">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#f5f4f0] py-24 sm:py-32" aria-labelledby="noise-heading">
          <div className="section-reveal mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <div>
                <p className="section-kicker">From noise to signal</p>
                <h2 id="noise-heading" className="mt-5 text-4xl leading-[1.04] font-semibold tracking-[-.045em] text-[#151a31] sm:text-[46px]">Customer work rarely happens in one place.</h2>
              </div>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#636a7c]">The email, the call, the proposal, the task and the outcome belong to the same relationship. FocusCRM puts them back into one continuous story.</p>
            </div>
            <div className="signal-story mt-16 overflow-x-auto pb-4">
              <div className="relative flex min-w-[760px] items-center justify-between">
                <span className="signal-line" aria-hidden="true" />
                {[
                  [ContactRound, "Person", "Olivia Martin"], [Building2, "Account", "Northstar Labs"], [MessageSquareText, "Conversation", "Proposal feedback"], [Target, "Opportunity", "$210K · Proposal"], [BarChart3, "Outcome", "Pipeline + revenue"],
                ].map(([Icon, label, value], index) => {
                  const SignalIcon = Icon as typeof ContactRound;
                  return <div key={String(label)} className="signal-step relative z-10 flex w-32 flex-col items-start text-left" style={{ animationDelay: `${index * 90}ms` }}><span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d9d7cf] bg-[#f5f4f0] text-[#4054e8]"><SignalIcon className="h-4.5 w-4.5" /></span><p className="mt-4 text-[10px] font-semibold tracking-[.12em] text-[#929080] uppercase">{String(label)}</p><p className="mt-1 text-xs font-semibold text-[#343849]">{String(value)}</p></div>;
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-[#eef2ff] py-24 sm:py-32">
          <div className="section-reveal mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[.82fr_1.18fr]">
            <div>
              <p className="section-kicker">A relationship, not a row</p>
              <h2 className="mt-5 text-4xl leading-[1.04] font-semibold tracking-[-.045em] text-[#151a31] sm:text-[46px]">Everything important. Nothing disconnected.</h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-[#626b80]">FocusCRM treats contacts, companies, deals and activity as connected views of the same customer—not isolated modules your team has to reconcile.</p>
              <a href="#solutions" className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#4054e8]">See how teams use it <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></a>
            </div>
            <RelationshipMap />
          </div>
        </section>

        <section id="solutions" className="relative overflow-hidden bg-[#0b102b] py-24 text-white sm:py-32">
          <div className="section-reveal mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 xl:grid-cols-[.72fr_1.28fr]">
              <div>
                <p className="text-xs font-semibold tracking-[.14em] text-[#91a0ff] uppercase">For sales teams</p>
                <h2 className="mt-5 text-4xl leading-[1.04] font-semibold tracking-[-.045em] sm:text-[46px]">Know which opportunities deserve attention.</h2>
                <p className="mt-6 max-w-lg text-base leading-7 text-white/60">Value, stage, owner, timing and customer history stay visible together. The board becomes a decision surface, not just a list of cards.</p>
                <a href="#customer-success" className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#aab4ff]">Follow the customer story <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></a>
              </div>
              <div className="scroll-thin overflow-x-auto pb-3"><PipelinePreview /></div>
          </div>
        </section>

        <section id="customer-success" className="py-24 sm:py-32">
          <div className="section-reveal mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[.78fr_1.22fr]">
            <div>
              <p className="section-kicker">For customer success</p>
              <h2 className="mt-5 text-4xl leading-[1.04] font-semibold tracking-[-.045em] text-[#151a31] sm:text-[46px]">Never lose the context behind a conversation.</h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-[#687084]">See the relationship before you reply: who the customer is, what they bought, what was promised and what the team needs to do next.</p>
              <div className="mt-9 space-y-4 border-l border-[#dfe2ea] pl-5">
                {["One shared customer timeline", "Sales and support context together", "Notes and next steps attached to the account"].map((item) => <p key={item} className="flex items-center gap-3 text-sm text-[#4f576c]"><Check className="h-4 w-4 text-[#4054e8]" />{item}</p>)}
              </div>
            </div>
            <div className="customer-scene relative sm:pl-8"><span className="customer-scene-label">Focused account</span><CustomerPreview /></div>
          </div>
        </section>

        <section className="bg-[#f7f8fb] py-24 sm:py-32">
          <div className="section-reveal mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid gap-12 lg:grid-cols-[.68fr_1.32fr]">
              <div>
                <p className="section-kicker">For leadership</p>
                <h2 className="mt-5 text-4xl leading-[1.04] font-semibold tracking-[-.045em] text-[#151a31] sm:text-[46px]">See where the business is actually moving.</h2>
                <p className="mt-6 max-w-lg text-base leading-7 text-[#687084]">Performance is calculated from live customer work—not assembled in a separate reporting process.</p>
              </div>
              <div className="leadership-signal border-l border-[#dfe2ea] pl-6 sm:pl-10">
                <div className="flex flex-wrap gap-x-10 gap-y-6">
                  {[["$1.84M", "Open pipeline", "+18.4%"], ["42.8%", "Win rate", "+3.1%"], ["$428K", "Won revenue", "+12.7%"]].map(([value, label, change]) => <div key={label}><p className="text-3xl font-semibold tracking-[-.05em] text-[#171c34] sm:text-4xl">{value}</p><p className="mt-1 text-[11px] text-[#777e91]">{label} <span className="ml-1 font-semibold text-[#15803d]">{change}</span></p></div>)}
                </div>
                <svg viewBox="0 0 720 240" className="mt-10 w-full" role="img" aria-label="Revenue signal rising over time">
                  <defs><linearGradient id="leadership-area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#4054e8" stopOpacity=".22"/><stop offset="1" stopColor="#4054e8" stopOpacity="0"/></linearGradient></defs>
                  {[48, 105, 162, 219].map((y) => <line key={y} x1="0" x2="720" y1={y} y2={y} stroke="#e4e6ed" strokeDasharray="3 7" />)}
                  <path d="M0 208 C45 204 62 181 103 188 S165 154 214 161 S288 126 331 137 S405 98 451 109 S533 69 573 83 S653 35 720 42 L720 240 L0 240Z" fill="url(#leadership-area)" />
                  <path d="M0 208 C45 204 62 181 103 188 S165 154 214 161 S288 126 331 137 S405 98 451 109 S533 69 573 83 S653 35 720 42" fill="none" stroke="#4054e8" strokeWidth="4" strokeLinecap="round" className="chart-line" />
                  <circle cx="720" cy="42" r="7" fill="#4054e8" stroke="white" strokeWidth="4" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <div className="section-reveal mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="section-kicker">For operations</p>
              <h2 className="mt-5 text-4xl leading-[1.04] font-semibold tracking-[-.045em] text-[#151a31] sm:text-[46px]">Turn customer activity into clear action.</h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-[#687084]">Tasks, calls, meetings and ownership form one visible workday. Everyone can see what is due and why it matters.</p>
            </div>
            <div className="lg:pl-12">
              <div className="workday-timeline relative">
                {timeline.map((item) => <div key={item.time} className="group grid grid-cols-[48px_32px_1fr] items-start gap-3 py-4"><time className="pt-1 text-[10px] font-semibold text-[#a0a5b3]">{item.time}</time><span className="z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#e1e4eb] bg-white transition-transform group-hover:scale-110"><item.icon className="h-3.5 w-3.5" style={{ color: item.color }} /></span><div className="border-b border-[#eceef3] pb-4"><p className="text-sm font-semibold text-[#30364c]">{item.title}</p><p className="mt-1 text-[11px] text-[#858b9c]">{item.detail}</p></div></div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[#e8eaf0] py-24 sm:py-32">
          <div className="section-reveal mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-3xl">
              <p className="section-kicker">Bring the relationship into view</p>
              <h2 className="mt-5 text-4xl leading-[1.04] font-semibold tracking-[-.045em] text-[#11162e] sm:text-[46px]">Less searching. More knowing what comes next.</h2>
            </div>
          </div>
        </section>
      </main>

      <footer id="resources" className="border-t border-[#e9ebf1] bg-[#fafbfc]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div><FocusBrand /><p className="mt-2 max-w-xs text-xs leading-5 text-[#7a8193]">Everything important about your customers, without the noise.</p></div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-[#666e82]"><a href="#product" className="hover:text-[#4054e8]">Product</a><a href="#solutions" className="hover:text-[#4054e8]">Solutions</a></div>
          <p className="text-[11px] text-[#969cab]">© 2026 FocusCRM</p>
        </div>
      </footer>
    </div>
  );
}
