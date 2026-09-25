import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-6xl font-semibold tracking-tight text-primary">404</p>
      <h1 className="text-xl font-semibold text-fg">Page not found</h1>
      <p className="text-sm text-muted">The page you are looking for doesn&apos;t exist.</p>
      <Link href="/dashboard" className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">Back to dashboard</Link>
    </div>
  );
}
