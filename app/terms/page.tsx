import Link from "next/link";
import { QuillLogo } from "@/components/quill-logo";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <QuillLogo />
          <Link href="/login" className="text-sm text-muted hover:text-ink">
            Back to app
          </Link>
        </div>

        <div className="mt-10 quill-card p-8">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand">
            Terms of Service
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-ink">Terms for using Quill</h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            Quill is provided on an as-is basis for content creation, scheduling, and
            publishing workflows. You are responsible for the content you publish and for
            complying with the policies of any connected platform.
          </p>
          <p className="mt-4 text-sm leading-6 text-muted">
            These terms are a product placeholder and should be reviewed before launch.
          </p>
        </div>
      </div>
    </main>
  );
}
