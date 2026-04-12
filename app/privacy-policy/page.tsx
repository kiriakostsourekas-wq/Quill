import Link from "next/link";
import { QuillLogo } from "@/components/quill-logo";

const sections = [
  {
    title: "Information We Collect",
    body:
      "We collect information you provide directly to Quill, including account details, content drafts, connected social account metadata, billing information, and support requests. We may also collect product usage and device information to operate and improve the service.",
  },
  {
    title: "How We Use Information",
    body:
      "We use your information to authenticate your account, analyze your writing style, schedule and publish posts, process payments, improve the product, and communicate service updates.",
  },
  {
    title: "Sharing",
    body:
      "We share data only with infrastructure and service providers needed to operate Quill, such as hosting, payments, analytics, and AI providers. We may also disclose data if required by law.",
  },
  {
    title: "Contact",
    body: "For privacy questions, contact privacy@quill.so.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <QuillLogo />
          <Link href="/" className="text-sm text-muted hover:text-ink">
            Back to app
          </Link>
        </div>

        <div className="mt-10 quill-card p-8">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand">
            Privacy Policy
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-ink">
            How Quill handles personal information
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
            Effective date: April 11, 2026. This page describes how Quill collects,
            uses, and shares information across the product app.
          </p>

          <div className="mt-10 space-y-6">
            {sections.map((section) => (
              <section key={section.title} className="rounded-xl border border-line p-5">
                <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
