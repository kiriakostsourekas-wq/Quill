import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center">
      <div className="quill-card max-w-lg p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-ink">Analytics coming soon.</h1>
        <p className="mt-2 text-sm text-muted">
          We&apos;re working on it.
        </p>
      </div>
    </section>
  );
}
