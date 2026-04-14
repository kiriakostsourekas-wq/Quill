import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  Check,
  CheckCheck,
  Clock3,
  Columns2,
  Feather,
  Fingerprint,
  Menu,
  Mic,
  PenLine,
  Send,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const steps = [
  {
    num: "01",
    icon: Mic,
    title: "Train your voice",
    description:
      "Paste 3 to 5 of your past posts. Quill analyzes your tone, phrasing, and rhythm to build your Voice DNA profile.",
  },
  {
    num: "02",
    icon: PenLine,
    title: "Write your post",
    description:
      "Compose once and get a live voice score as you type so you can see exactly how much the draft sounds like you.",
  },
  {
    num: "03",
    icon: Send,
    title: "Publish everywhere",
    description:
      "Schedule to LinkedIn and X from one workflow. Quill adapts the post while protecting your voice.",
  },
];

const features = [
  {
    icon: Fingerprint,
    title: "Voice DNA",
    description:
      "Quill scores every draft against your voice profile so nothing goes out sounding generic or over-polished.",
  },
  {
    icon: Columns2,
    title: "One editor, all platforms",
    description:
      "Write once and shape your post for LinkedIn and X without jumping between tools or flattening your message.",
  },
  {
    icon: Clock3,
    title: "Smart scheduling",
    description:
      "Queue posts for the right moment or publish instantly when the draft is ready and the voice score is strong.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "For trying Quill without a card and building an initial publishing habit.",
    note: "No card required",
    features: [
      "Up to 10 posts per month",
      "One connected social account",
      "Voice DNA scoring",
      "Carousel creator",
    ],
    featured: false,
  },
  {
    name: "Solo",
    price: "$12",
    description: "For creators who want to publish more often across LinkedIn and X.",
    note: "7-day trial, card required",
    features: [
      "Unlimited posts",
      "LinkedIn + X publishing",
      "Unlimited scheduled posts",
      "First comment automation",
      "Advanced carousel publishing",
    ],
    featured: false,
  },
  {
    name: "Pro",
    price: "$29",
    description: "For power users who want rewriting, stronger workflows, and analytics.",
    note: "7-day trial, card required",
    features: [
      "Everything in Solo",
      "AI voice rewriting",
      "Analytics dashboard",
      "Priority publishing workflow",
    ],
    featured: true,
  },
];

const faqs = [
  {
    q: "What is Voice DNA?",
    a: "Voice DNA is Quill's writing-style layer. It studies your past posts, identifies the patterns that make your writing sound like you, and scores each new draft against that profile.",
  },
  {
    q: "Which platforms do you support?",
    a: "Quill currently supports LinkedIn and X. You can start with one and connect the other later from Settings.",
  },
  {
    q: "Do I need to log in immediately?",
    a: "No. You can scroll the site, review features and pricing, and only start authentication when you click Start free.",
  },
  {
    q: "How is Quill different from Buffer or Postiz?",
    a: "Most schedulers optimize for output volume. Quill is built around preserving voice quality, so the product helps you scale posting without sounding like generic AI.",
  },
  {
    q: "Can I use Quill for free?",
    a: "Yes. Quill includes a limited Free plan with up to 10 posts per month and one connected social account. Paid plans add unlimited posting, multi-platform workflows, and advanced features.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Free never requires a card. Paid plans start with a 7-day trial, and you can cancel before billing or later from your account settings.",
  },
];

const scoreRows = [
  { label: "Tone match", value: "94%" },
  { label: "Sentence rhythm", value: "89%" },
  { label: "Word choice", value: "91%" },
];

const platformPreviews = [
  {
    platform: "LinkedIn",
    accent: "bg-sky-500",
    copy:
      "Your best content does not need to sound robotic to scale. Quill helps me keep my voice while posting consistently.",
  },
  {
    platform: "X",
    accent: "bg-slate-900",
    copy:
      "Quill catches the parts that stop a draft from sounding like me and fixes them before I hit publish.",
  },
];

function StartButtons({ centered = false }: { centered?: boolean }) {
  return (
    <div
      className={`flex flex-col items-start gap-3 ${centered ? "items-center justify-center" : ""}`}
    >
      <form action="/api/auth/linkedin" method="post">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-medium text-white transition hover:bg-brand/90"
        >
          Start free
        </button>
      </form>
      <p className="text-sm text-muted">
        Start with LinkedIn. Connect X later from Settings.
      </p>
    </div>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.onboardingCompleted ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="min-h-screen bg-canvas">
      <nav className="sticky top-0 z-50 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
              <Feather className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-ink">Quill</p>
              <p className="text-xs text-muted">Voice-aware publishing</p>
            </div>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:block">
            <StartButtons />
          </div>

          <div className="md:hidden">
            <Link href="/login" className="inline-flex items-center text-muted hover:text-ink">
              <Menu className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </nav>

      <section className="px-6 pb-20 pt-24 md:pb-28 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-line bg-brand-light px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span className="text-xs font-medium text-brand">Introducing Voice DNA</span>
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl md:text-6xl">
            Write once. Sound like you. <span className="text-brand">Publish everywhere.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Quill learns your writing voice, adapts posts for LinkedIn and X, and handles
            scheduling so your publishing scales without becoming generic.
          </p>

          <div className="mt-10">
            <StartButtons centered />
          </div>

          <p className="mt-5 text-sm text-muted">
            Free plan available · Paid plans start with a 7-day trial
          </p>
        </div>
      </section>

      <section className="px-6 pb-20 md:pb-28">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-line bg-white shadow-soft">
          <div className="flex items-center gap-2 border-b border-line bg-slate-50 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-4 text-xs text-muted">quill-ai.dev</span>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.5fr_1fr]">
            <div className="border-b border-line bg-slate-50/50 p-6 lg:border-b-0 lg:border-r">
              <div className="rounded-3xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                      Draft Studio
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-ink">
                      Ship one idea across every channel
                    </h3>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand">
                    <Sparkles className="h-3.5 w-3.5" />
                    Voice DNA live
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-line bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-ink">Post draft</p>
                      <p className="max-w-xl text-sm leading-7 text-muted">
                        Most creator tools optimize for volume. I care more about consistency. If
                        my writing loses the texture of how I actually speak, I would rather post
                        less often and keep the trust.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-2 text-right ring-1 ring-line">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Score</p>
                      <p className="mt-1 text-2xl font-bold text-ink">92</p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full w-[92%] rounded-full bg-brand" />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
                      <div className="flex items-center gap-2 text-sm font-medium text-ink">
                        <Fingerprint className="h-4 w-4 text-brand" />
                        Signature phrases
                      </div>
                      <p className="mt-2 text-sm text-muted">“texture of how I speak” detected</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
                      <div className="flex items-center gap-2 text-sm font-medium text-ink">
                        <CheckCheck className="h-4 w-4 text-emerald-500" />
                        Safe to publish
                      </div>
                      <p className="mt-2 text-sm text-muted">Matches your prior top posts</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
                      <div className="flex items-center gap-2 text-sm font-medium text-ink">
                        <CalendarClock className="h-4 w-4 text-amber-500" />
                        Best window
                      </div>
                      <p className="mt-2 text-sm text-muted">Tomorrow, 8:30 AM local time</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {platformPreviews.map((preview) => (
                    <div key={preview.platform} className="rounded-2xl border border-line bg-white p-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${preview.accent}`} />
                        <span className="text-sm font-medium text-ink">{preview.platform} preview</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted">{preview.copy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-6 text-white">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/80">
                  Voice DNA Panel
                </p>
                <h3 className="mt-3 text-2xl font-semibold">Protected brand voice</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Quill continuously checks whether each draft still sounds recognizably like you
                  before it reaches the scheduler.
                </p>

                <div className="mt-6 space-y-3">
                  {scoreRows.map((row) => (
                    <div key={row.label} className="rounded-2xl bg-white/5 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{row.label}</span>
                        <span className="font-semibold text-white">{row.value}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-300 to-sky-300"
                          style={{ width: row.value }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
                    AI suggestion
                  </p>
                  <p className="mt-2 text-sm leading-6 text-violet-50">
                    Replace “optimize for volume” with “reward output over clarity” to better
                    match your usual phrasing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-slate-50/70 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Three steps to posting that sounds like you
            </h2>
          </div>

          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step) => (
              <div key={step.num} className="text-center md:text-left">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light">
                  <step.icon className="h-5 w-5 text-brand" />
                </div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">
                  Step {step.num}
                </p>
                <h3 className="mb-2 text-xl font-semibold text-ink">{step.title}</h3>
                <p className="leading-relaxed text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Everything you need to post with confidence
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-line bg-white p-7 transition-colors hover:border-brand/30"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-light">
                  <feature.icon className="h-5 w-5 text-brand" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-ink">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-slate-50/70 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Simple, transparent pricing
            </h2>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border bg-white p-8 ${
                  plan.featured ? "border-brand shadow-soft" : "border-line"
                }`}
              >
                {plan.featured && (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white">
                    Most popular
                  </span>
                )}

                <h3 className="text-xl font-semibold text-ink">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted">{plan.description}</p>

                <div className="mb-6 mt-6">
                  <span className="text-4xl font-bold text-ink">{plan.price}</span>
                  <span className="text-sm text-muted">/month</span>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">
                    {plan.note}
                  </p>
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-ink">
                      <Check className="h-4 w-4 flex-shrink-0 text-brand" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <StartButtons />
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted">
            Everyone starts on Free. Upgrade inside Quill when you need more volume, multi-platform publishing, and analytics.
          </p>
        </div>
      </section>

      <section id="faq" className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-line bg-white p-6">
                <h3 className="text-base font-semibold text-ink">{faq.q}</h3>
                <p className="mt-3 leading-relaxed text-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand px-6 py-20 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to post in your own voice?
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Review the product first, then start with the provider you already use most.
          </p>
          <div className="mt-8">
            <StartButtons centered />
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Link href="/" className="flex items-center gap-2">
              <Feather className="h-5 w-5 text-brand" />
              <span className="text-lg font-bold text-ink">Quill</span>
            </Link>

            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted transition-colors hover:text-ink"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 sm:flex-row">
            <p className="text-sm text-muted">© 2026 Quill. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy-policy" className="text-sm text-muted transition-colors hover:text-ink">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-muted transition-colors hover:text-ink">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
