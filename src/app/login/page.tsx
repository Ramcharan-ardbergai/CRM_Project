"use client";

import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FocusBrand } from "@/components/marketing/Brand";
import { CustomerPreview, DashboardPreview } from "@/components/marketing/ProductVisuals";
import { Avatar, Button, Field, Input } from "@/components/ui/primitives";
import { useHydrated } from "@/lib/hooks";
import { useCRM } from "@/lib/store";
import { toast } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

const DEMO_PASSWORD = "demo123";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const users = useCRM((s) => s.users);
  const session = useCRM((s) => s.sessionUserId);
  const login = useCRM((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [visualState, setVisualState] = useState<"idle" | "email" | "password" | "success">("idle");
  const next = params.get("next") || "/dashboard";

  useEffect(() => {
    if (!email && users[0]) setEmail(users[0].email);
  }, [users, email]);

  useEffect(() => {
    if (hydrated && session) router.replace(next);
  }, [hydrated, session, router, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || password !== DEMO_PASSWORD) {
      setError("The email or password is incorrect. Choose a workspace user below to continue.");
      setVisualState("idle");
      return;
    }
    setLoading(true);
    setVisualState("success");
    await new Promise((resolve) => setTimeout(resolve, 450));
    login(user.id);
    toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
  };

  return (
    <main className="login-page grid min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#fbfbfd] lg:grid-cols-[minmax(390px,.82fr)_minmax(0,1.18fr)]">
      <section className="relative flex min-h-screen min-w-0 max-w-full flex-col overflow-hidden px-5 py-6 sm:px-10 sm:py-8 lg:px-12 xl:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(64,84,232,.06),transparent_34%)]" aria-hidden="true" />
        <div className="auth-enter auth-enter-1 relative flex items-center justify-between">
          <Link href="/" aria-label="FocusCRM home"><FocusBrand /></Link>
          <Link href="/" className="rounded-lg px-3 py-2 text-xs font-semibold text-[#6d7488] transition-colors hover:bg-white hover:text-[#2b3249]">Back to website</Link>
        </div>

        <div className="auth-enter auth-enter-2 relative mx-auto flex w-full min-w-0 max-w-[410px] flex-1 flex-col justify-center py-12 sm:py-16">
          <div className="mb-8">
            <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe3ff] bg-[#f3f4ff] text-[#4054e8]"><ShieldCheck className="h-5 w-5" /></span>
            <h1 className="text-[32px] leading-tight font-semibold tracking-[-.045em] text-[#11162e] sm:text-[38px]">Welcome back.</h1>
            <p className="mt-2 text-[15px] leading-6 text-[#747b8e]">Sign in to continue to your workspace.</p>
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Work email">
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#959bad]" />
                <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} onFocus={() => setVisualState("email")} onBlur={() => !loading && setVisualState("idle")} className="h-12 rounded-xl border-[#dfe2ea] bg-white pl-10 text-[15px] shadow-[0_2px_8px_rgba(20,25,55,.025)]" autoComplete="email" aria-invalid={!!error} required />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#959bad]" />
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} onFocus={() => setVisualState("password")} onBlur={() => !loading && setVisualState("idle")} className="h-12 rounded-xl border-[#dfe2ea] bg-white pr-11 pl-10 text-[15px] shadow-[0_2px_8px_rgba(20,25,55,.025)]" autoComplete="current-password" aria-invalid={!!error} required />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#8d93a4] hover:bg-[#f1f2f6] hover:text-[#4e556a]" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            {error && <div role="alert" className="rounded-xl border border-[#f2caca] bg-[#fff6f6] px-3.5 py-3 text-[13px] leading-5 text-[#b83238]">{error}</div>}
            <Button type="submit" variant="primary" className="marketing-primary-button h-12 w-full rounded-xl border-0 text-[15px]" loading={loading || !hydrated}>Sign in <ArrowRight className="h-4 w-4" /></Button>
          </form>

          <div className="mt-8 border-t border-[#e8eaf0] pt-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold text-[#4c5369]">Workspace users</p><p className="mt-0.5 text-[11px] text-[#969cad]">Demo password: <code className="font-semibold text-[#697086]">{DEMO_PASSWORD}</code></p></div>
              <span className="rounded-full bg-[#eef0ff] px-2 py-1 text-[9px] font-semibold text-[#4054e8]">CSV workspace</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {users.slice(0, 5).map((user) => (
                <button key={user.id} type="button" onClick={() => { setEmail(user.email); setPassword(DEMO_PASSWORD); setError(""); }} className="group flex items-center gap-2 rounded-full border border-[#e0e3eb] bg-white py-1 pr-3 pl-1 text-[11px] font-semibold text-[#4d556a] transition-all hover:-translate-y-0.5 hover:border-[#bdc5fa] hover:shadow-md" aria-label={`Sign in as ${user.name}`}>
                  <Avatar name={user.name} color={user.color} size={25} />{user.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="login-mobile-visual mt-10 lg:hidden" aria-label="Customer relationship preview">
            <CustomerPreview />
          </div>
        </div>

        <p className="relative text-[11px] text-[#a0a5b3]">© 2026 FocusCRM</p>
      </section>

      <aside className="relative hidden min-h-screen overflow-hidden bg-[#0c1230] p-8 lg:flex lg:flex-col lg:justify-center xl:p-12" aria-label="FocusCRM product preview">
        <div className="auth-enter auth-enter-3 relative mx-auto w-full max-w-[760px]">
          <div className="mb-9 max-w-xl">
            <p className="text-[11px] font-semibold tracking-[.14em] text-[#91a0ff] uppercase">Your customer relationships</p>
            <h2 className="mt-4 text-3xl leading-[1.05] font-semibold tracking-[-.045em] text-white xl:text-[42px]">One intelligent workspace. Complete visibility.</h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/52">Move from pipeline performance to the detail behind a conversation without losing context.</p>
          </div>
          <div className={cn("auth-visual login-product-preview relative", `auth-visual-${visualState}`)}><DashboardPreview compact showInsights={false} /></div>
          <div className="mt-7 flex items-center gap-5 text-[10px] font-medium text-white/42">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#5fd4ee]" />Connected data</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#91a0ff]" />Live pipeline</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />Clear next steps</span>
          </div>
        </div>
      </aside>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
