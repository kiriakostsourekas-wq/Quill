import Link from "next/link";

export default function UnsubscribePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9F9F9] px-6 py-16">
      <div className="w-full max-w-xl rounded-xl border border-line bg-white p-10 text-center">
        <h1 className="text-2xl font-semibold text-ink">You have been unsubscribed from Quill emails.</h1>
        <p className="mt-3 text-sm text-muted">
          You will no longer receive product update emails from Quill.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-brand hover:text-brand"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
