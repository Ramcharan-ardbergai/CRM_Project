"use client";

import { ArrowRight, BarChart3, Kanban, Lock, Mail, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Logo } from "@/components/layout/Sidebar";
import { Avatar, Button, Field, Input } from "@/components/ui/primitives";
import { useHydrated } from "@/lib/hooks";
import { useCRM } from "@/lib/store";
import { toast } from "@/lib/ui-store";

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const next = params.get("next") || "/";

  // Prefill the workspace admin (first imported user).
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
      setError("Invalid email or password.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 450));
    login(user.id);
    toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-3xl font-semibold tracking-tight text-fg">Sign in</h1>
          <p className="mt-2 text-sm text-muted">Welcome back! Sign in to your workspace to continue.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Work email">
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 pl-9" autoComplete="email" />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pl-9" autoComplete="current-password" />
              </div>
            </Field>
            {error && <p className="tone-red rounded-lg px-3 py-2 text-sm">{error}</p>}
            <Button type="submit" variant="primary" className="h-11 w-full" loading={loading || !hydrated}>
              Sign in <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-dashed border-line-strong p-4">
            <p className="text-xs font-medium text-muted">Users from your CSV data · password <code className="rounded bg-surface-2 px-1 text-fg">{DEMO_PASSWORD}</code></p>
            <div className="mt-3 flex flex-wrap gap-2">
              {users.slice(0, 4).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setEmail(u.email); setPassword(DEMO_PASSWORD); }}
                  className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-xs font-medium text-fg-2 hover:border-primary/50"
                >
                  <Avatar name={u.name} color={u.color} size={22} />
                  {u.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-subtle">© {new Date().getFullYear()} Focus CRM</p>
      </div>

      <div className="relative hidden overflow-hidden bg-[#0f1330] lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-[#4054e8] opacity-40 blur-[120px]" />
        <div className="absolute -bottom-40 left-0 h-[380px] w-[380px] rounded-full bg-[#7c5cf0] opacity-30 blur-[120px]" />
        <div className="relative max-w-lg">
          <p className="text-sm font-medium text-[#a5b0ff]">Sales · Relationships · Support</p>
          <h2 className="mt-3 text-4xl leading-tight font-semibold tracking-tight text-white">Every customer conversation, in focus.</h2>
          <p className="mt-4 text-base text-[#b9bfdc]">Track contacts, move deals through your pipeline, and never miss a follow-up — all from one workspace.</p>
          <div className="mt-10 grid gap-3">
            {[
              { icon: Kanban, title: "Visual pipeline", text: "Drag deals across stages with live forecasts." },
              { icon: BarChart3, title: "Real-time analytics", text: "Revenue, win rate and team performance at a glance." },
              { icon: ShieldCheck, title: "Customer support", text: "Tickets linked to every account and contact." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-white">{f.title}</p>
                  <p className="text-sm text-[#b9bfdc]">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
