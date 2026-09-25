import { AppShell } from "@/components/layout/AppShell";

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
