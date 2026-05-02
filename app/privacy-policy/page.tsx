import Link from "next/link";
import { QuillLogo } from "@/components/quill-logo";

const sections = [
  {
    title: "Information We Collect",
    body:
      "We collect information you provide directly to Quill, including account details, content drafts, connected social account metadata, and support requests. We may also collect product usage and device information to operate and improve the service. If paid plans are introduced later, billing information would be collected at that time.",
  },
  {
    title: "How We Use Information",
    body:
      "We use your information to authenticate your account, analyze your writing style, schedule and publish posts, improve the product, and communicate service updates. If paid plans launch later, payment information would be used to manage billing.",
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
    <main className="min-h-screen bg-[#F4F6F7] px-6 py-8 text-[#15161A] sm:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex h-14 items-center justify-between rounded-full border border-white/80 bg-[#FFFFFF]/88 px-5 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <QuillLogo />
          <Link href="/" className="text-xs font-medium text-slate-600 transition hover:text-brand">
            Back home
          </Link>
        </div>

        <div className="mt-10 rounded-[30px] border border-white bg-[#FFFFFF] p-8 shadow-[0_28px_80px_rgba(15,23,42,0.1)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
            Privacy Policy
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-[#15161A]">
            How Quill handles personal information
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
            Effective date: April 11, 2026. This page describes how Quill collects,
            uses, and shares information across the product app.
          </p>

          <div className="mt-10 space-y-6">
            {sections.map((section) => (
              <section key={section.title} className="rounded-3xl border border-line bg-[#FAFBFB] p-5">
                <h2 className="text-lg font-semibold text-[#15161A]">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
