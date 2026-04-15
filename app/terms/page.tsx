import Link from "next/link";
import { QuillLogo } from "@/components/quill-logo";

export default function TermsPage() {
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
            Terms of Service
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-ink">Terms for using Quill</h1>
          <div className="mt-8 space-y-8 text-sm leading-6 text-muted">
            <section>
              <h2 className="text-base font-semibold text-ink">Acceptance of Terms</h2>
              <p className="mt-2">
                By creating an account, connecting a social platform, or using Quill, you agree
                to these Terms of Service. If you do not agree, do not use the service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-ink">Description of Service</h2>
              <p className="mt-2">
                Quill is a software service that helps users draft, schedule, rewrite, and publish
                social media content across supported platforms, including LinkedIn and X. Quill
                also provides Voice DNA analysis to help users keep a consistent writing style.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-ink">User Accounts</h2>
              <p className="mt-2">
                You are responsible for maintaining the security of your account and any connected
                third-party accounts. You must provide accurate information and keep it current.
                You are responsible for all activity that happens under your account.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-ink">Acceptable Use</h2>
              <p className="mt-2">
                You may not use Quill to publish illegal, deceptive, infringing, hateful, abusive,
                or spam content. You may not attempt to interfere with the service, bypass access
                controls, scrape other users&apos; data, or use Quill in a way that violates the
                rules of LinkedIn, X, Stripe, Groq, Supabase, or any other connected provider.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-ink">Payment and Billing</h2>
              <p className="mt-2">
                Quill is currently offered free during beta, and no payment method is required to
                use the product at this stage. Quill may introduce paid plans in the future. If
                that happens, Quill will update these terms, update in-product messaging, and give
                users notice before any billing begins.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-ink">Intellectual Property</h2>
              <p className="mt-2">
                Quill and its software, branding, interface, and underlying technology are owned by
                Quill or its licensors. You retain ownership of the content you create and publish
                using the service. You grant Quill a limited right to process your content only as
                necessary to provide the product.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-ink">Limitation of Liability</h2>
              <p className="mt-2">
                To the maximum extent allowed by law, Quill is provided on an as-is and
                as-available basis. Quill is not liable for indirect, incidental, special,
                consequential, or punitive damages, including loss of revenue, loss of data,
                business interruption, or damage caused by failed posts, provider outages, or
                third-party platform enforcement actions.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-ink">Termination</h2>
              <p className="mt-2">
                You may stop using Quill at any time. Quill may suspend or terminate access if you
                violate these terms, create risk for the service, or use the product in a way that
                exposes Quill or its users to legal or operational harm.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-ink">Governing Law</h2>
              <p className="mt-2">
                These terms are governed by the laws of the jurisdiction where Quill operates,
                without regard to conflict-of-law rules. You agree that disputes will be resolved
                in the courts located in that jurisdiction unless applicable law requires
                otherwise.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-ink">Contact</h2>
              <p className="mt-2">
                Questions about these terms can be sent through Quill&apos;s support contact or the
                contact details published on the public Quill website.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
