"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useHydrated } from "@/lib/hooks";
import { useCRM } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AssistantButton, AssistantPanel } from "../assistant/Assistant";
import { DealDrawer } from "../crm/DealDrawer";
import { FormHost } from "../forms/FormHost";
import { Skeleton } from "../ui/primitives";
import { CommandSearch } from "./CommandSearch";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-[264px] border-r border-line bg-surface p-5 lg:block">
        <Skeleton className="h-9 w-36" />
        <div className="mt-8 space-y-3">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-8" />)}</div>
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="mt-8 h-8 w-64" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        <Skeleton className="mt-4 h-80 rounded-2xl" />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const session = useCRM((s) => s.sessionUserId);
  const collapsed = useCRM((s) => s.sidebarCollapsed);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !session) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, session, router, pathname]);

  if (!hydrated || !session) return <ShellSkeleton />;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className={cn("flex min-h-screen flex-col transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[264px]")}>
        <Topbar />
        <main key={pathname} className="mx-auto w-full max-w-[1480px] flex-1 animate-slide-up px-4 py-6 md:px-6 lg:py-8">
          {children}
        </main>
      </div>
      <FormHost />
      <DealDrawer />
      <CommandSearch />
      <AssistantButton />
      <AssistantPanel />
    </div>
  );
}
