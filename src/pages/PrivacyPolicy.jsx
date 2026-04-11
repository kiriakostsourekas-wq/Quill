import { Link } from 'react-router-dom'
import { Feather } from 'lucide-react'

const sections = [
  {
    title: 'Information We Collect',
    body:
      'We may collect information you choose to provide to us, such as your name, email address, social profile details, billing details, and any content you upload or draft inside Quill. We may also collect basic technical data like device type, browser, IP address, referring pages, and product usage events.',
  },
  {
    title: 'How We Use Information',
    body:
      'We use information to operate Quill, personalize your experience, improve product performance, communicate with you, provide support, process payments, prevent abuse, and comply with legal obligations.',
  },
  {
    title: 'How We Share Information',
    body:
      'We may share information with service providers that help us host the product, process payments, deliver email, support analytics, and keep the service secure. We may also disclose information when required by law or as part of a merger, acquisition, or asset sale.',
  },
  {
    title: 'Data Retention',
    body:
      'We retain information for as long as needed to provide the service, maintain business records, resolve disputes, enforce agreements, and comply with legal requirements. We may delete or anonymize data when it is no longer needed.',
  },
  {
    title: 'Your Choices',
    body:
      'You can request access to, correction of, or deletion of your personal information where applicable. You can also opt out of certain product emails and marketing communications. Depending on your location, you may have additional privacy rights under local law.',
  },
  {
    title: 'Security',
    body:
      'We use reasonable administrative, technical, and organizational measures to protect personal information. No system is completely secure, so we cannot guarantee absolute security.',
  },
  {
    title: 'Contact',
    body:
      'For privacy-related questions or requests, contact us at privacy@quill.so.',
  },
]

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Feather className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight">Quill</span>
          </Link>
          <Link
            to="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">
              Privacy Policy
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              How Quill handles personal information
            </h1>
            <p className="mt-6 text-base leading-7 text-muted-foreground sm:text-lg">
              Effective date: April 11, 2026. This policy explains how Quill collects,
              uses, and shares information when you visit our website or use our services.
            </p>
          </div>

          <div className="mt-12 space-y-8">
            {sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <p className="mt-3 leading-7 text-muted-foreground">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-muted/40 p-6 text-sm leading-6 text-muted-foreground">
            This page is a product-facing privacy policy for the current Quill website. It
            should be reviewed and finalized with legal counsel before launch in regulated
            jurisdictions.
          </div>
        </div>
      </main>
    </div>
  )
}
