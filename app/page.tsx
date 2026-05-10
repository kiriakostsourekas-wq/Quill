import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  FileText,
  Fingerprint,
  LockKeyhole,
  PenLine,
  Play,
  Send,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Draft Studio", href: "#draft-studio" },
  { label: "Pricing", href: "#pricing" },
];

const platformChips = ["LinkedIn", "Twitter", "Substack"];

function StartButton({
  label = "Get Started",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <form action="/api/auth/linkedin" method="post">
      <button
        type="submit"
        className={
          compact
            ? "inline-flex h-8 items-center justify-center rounded-full bg-brand px-5 text-[11px] font-semibold text-white shadow-[0_12px_30px_rgba(83,74,183,0.22)] transition hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
            : "inline-flex h-10 items-center justify-center rounded-full bg-brand px-6 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(83,74,183,0.2)] transition hover:-translate-y-0.5 hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
        }
      >
        {label}
      </button>
    </form>
  );
}

function PublicNav() {
  return (
    <header className="fixed inset-x-0 top-[14px] z-50 px-5">
      <nav className="mx-auto flex h-[42px] max-w-[856px] items-center justify-between rounded-full border border-white/90 bg-[#FFFFFF]/92 px-[18px] shadow-[0_24px_58px_rgba(20,24,31,0.17)] backdrop-blur-xl">
        <a href="#" className="text-[13px] font-bold tracking-[-0.03em] text-[#090B10]">
          Quill AI
        </a>

        <div className="hidden items-center gap-9 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[11px] font-medium text-[#5F6B7E] transition hover:text-brand"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <StartButton compact />
          <Link
            href="/login"
            aria-label="Open login"
            className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#BFC7D3] bg-[#FFFFFF] text-[#344054] transition hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
          >
            <CircleUserRound className="h-4 w-4" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function ProductMockup() {
  return (
    <div
      id="draft-studio"
      className="relative mx-auto mt-[34px] w-full max-w-[636px] rounded-[31px] border border-white bg-[#FFFFFF]/75 p-2 shadow-[0_32px_90px_rgba(24,31,43,0.16)]"
    >
      <div className="relative h-[286px] overflow-hidden rounded-[27px] border border-[#D8DEE7] bg-[#FAFBFB]">
        <div className="absolute inset-0 bg-[radial-gradient(#DCE4EB_1px,transparent_1px)] [background-size:15px_15px] opacity-50" />
        <div className="absolute left-0 top-0 z-10 flex h-full w-[50px] flex-col items-center border-r border-[#D8DEE7] bg-[#FFFFFF]/78 py-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-light text-brand">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="mt-7 h-3.5 w-3.5 rounded-full border border-[#CED6E1]" />
          <div className="mt-7 h-3.5 w-3.5 rounded-full border border-[#CED6E1]" />
        </div>

        <div className="relative z-10 ml-[50px] px-7 py-8">
          <div className="h-4 w-40 rounded-full bg-[#F4F6F8]" />
          <div className="mt-6 space-y-3">
            <div className="h-3 w-[94%] rounded-full bg-[#F1F4F7]" />
            <div className="h-3 w-[82%] rounded-full bg-[#F1F4F7]" />
            <div className="h-3 w-[74%] rounded-full bg-[#F1F4F7]" />
          </div>
        </div>

        <div className="absolute bottom-8 right-8 z-20 w-[170px] rounded-[23px] border border-white bg-[#FFFFFF]/92 p-4 shadow-[0_24px_55px_rgba(18,24,35,0.14)] backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0A66C2] text-[9px] font-bold text-white">
              in
            </span>
            <span className="text-xs font-semibold text-[#0D1117]">LinkedIn Ready</span>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#EEF1F5]">
            <div className="h-full w-[76%] rounded-full bg-brand" />
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceWaveVisual() {
  return (
    <div className="relative h-full min-h-[292px] overflow-hidden rounded-[27px] bg-[#F8FAFA] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 620 360"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#86989E" stopOpacity="0.48" />
            <stop offset="44%" stopColor="#AEBBC0" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#EDF2F3" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="waveHighlight" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="54%" stopColor="#EFF4F5" stopOpacity="0.52" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.15" />
          </linearGradient>
          <filter id="waveBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.8" />
          </filter>
          <filter id="waveShadow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="13" stdDeviation="8" floodColor="#52646C" floodOpacity="0.17" />
          </filter>
          <radialGradient id="waveMist" cx="72%" cy="12%" r="82%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.94" />
            <stop offset="52%" stopColor="#FAFBFB" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#D5E0E3" stopOpacity="0.46" />
          </radialGradient>
        </defs>
        <rect width="620" height="360" fill="url(#waveMist)" />
        <g filter="url(#waveShadow)">
          <path
            d="M -48 220 C 94 136 220 97 350 103 C 470 108 548 81 668 54"
            fill="none"
            stroke="url(#waveStroke)"
            strokeLinecap="round"
            strokeWidth="16"
          />
          <path
            d="M -54 252 C 104 159 238 120 368 125 C 488 130 568 106 676 84"
            fill="none"
            stroke="url(#waveStroke)"
            strokeLinecap="round"
            strokeWidth="16"
            opacity="0.9"
          />
          <path
            d="M -58 284 C 118 185 258 145 388 148 C 506 151 579 133 680 114"
            fill="none"
            stroke="url(#waveStroke)"
            strokeLinecap="round"
            strokeWidth="16"
            opacity="0.78"
          />
          <path
            d="M -62 316 C 132 214 278 173 408 173 C 522 173 592 162 684 148"
            fill="none"
            stroke="url(#waveStroke)"
            strokeLinecap="round"
            strokeWidth="15"
            opacity="0.62"
          />
        </g>
        <g filter="url(#waveBlur)" opacity="0.86">
          <path
            d="M -44 231 C 116 149 236 114 360 119 C 482 124 558 96 670 71"
            fill="none"
            stroke="url(#waveHighlight)"
            strokeLinecap="round"
            strokeWidth="5"
          />
          <path
            d="M -50 263 C 128 174 260 140 382 144 C 500 148 574 124 676 102"
            fill="none"
            stroke="url(#waveHighlight)"
            strokeLinecap="round"
            strokeWidth="5"
          />
          <path
            d="M -55 295 C 142 203 284 167 404 169 C 519 171 588 152 684 134"
            fill="none"
            stroke="url(#waveHighlight)"
            strokeLinecap="round"
            strokeWidth="5"
          />
        </g>
      </svg>
      <div className="absolute inset-x-0 top-0 h-[33%] bg-gradient-to-b from-[#FFFFFF] via-[#FFFFFF]/72 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-[28%] bg-gradient-to-l from-[#FFFFFF]/92 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F7F9F9]/95 to-transparent" />
    </div>
  );
}

function MiniSchedule() {
  return (
    <div className="rounded-[24px] border border-[#DDE4ED] bg-[#FFFFFF] p-4 shadow-[0_16px_34px_rgba(23,31,43,0.06)]">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-brand">
          <CalendarDays className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="h-3 w-24 rounded-full bg-[#DDE3EA]" />
          <div className="mt-2 h-2.5 w-32 rounded-full bg-[#F2F4F7]" />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-5 rounded-full bg-[#F2F4F7]" />
        <div className="h-5 overflow-hidden rounded-full bg-[#F2F4F7]">
          <div className="h-full w-[58%] rounded-full bg-[#6C5CE7] shadow-[0_0_22px_rgba(108,92,231,0.28)]" />
        </div>
      </div>
    </div>
  );
}

function AnalysisVisual() {
  return (
    <div className="relative min-h-[286px] overflow-hidden rounded-[30px] bg-[#5C6F6F] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(184,215,205,0.45),transparent_34%),radial-gradient(circle_at_80%_42%,rgba(224,197,119,0.28),transparent_28%),linear-gradient(135deg,#6F8581_0%,#4C5E60_46%,#374548_100%)]" />
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 560 320"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="networkGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>
        <g fill="none" stroke="#DCEEE8" strokeOpacity="0.2" strokeWidth="1">
          <path d="M-20 210 C94 90 200 232 310 116 S514 64 586 126" />
          <path d="M32 250 C142 162 220 252 340 168 S494 118 572 188" />
          <path d="M80 64 C168 128 222 38 326 94 S472 170 570 96" />
        </g>
        <g fill="#EAF6F1" opacity="0.55">
          {[
            [82, 216],
            [148, 144],
            [215, 203],
            [287, 128],
            [356, 166],
            [436, 98],
            [492, 148],
            [124, 82],
            [260, 70],
            [390, 236],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.4" />
          ))}
        </g>
        <g filter="url(#networkGlow)" fill="none" stroke="#F2FFF9" strokeOpacity="0.18">
          <path d="M82 216 L148 144 L215 203 L287 128 L356 166 L436 98 L492 148" />
          <path d="M124 82 L260 70 L287 128 L390 236" />
        </g>
      </svg>
      <div className="absolute left-1/2 top-1/2 w-[285px] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-white/70 bg-[#FFFFFF]/93 p-5 shadow-[0_24px_50px_rgba(16,24,32,0.24)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-light text-brand">
            <Fingerprint className="h-3.5 w-3.5" />
          </span>
          <span className="text-[12px] font-semibold text-[#111827]">Voice DNA Analysis</span>
        </div>
        <div className="mt-5 space-y-3">
          <div className="h-2.5 overflow-hidden rounded-full bg-[#E8EDF3]">
            <div className="h-full w-[78%] rounded-full bg-brand" />
          </div>
          <div className="h-2.5 w-[68%] rounded-full bg-[#4B5563]" />
          <div className="h-2.5 w-[86%] rounded-full bg-[#C4D1DE]" />
        </div>
      </div>
    </div>
  );
}

function ComposerVisual() {
  return (
    <div className="rounded-[28px] border border-[#E3E8EF] bg-[#FFFFFF]/92 p-5 shadow-[0_18px_42px_rgba(20,24,31,0.055)]">
      <div className="h-3 w-[78%] rounded-full bg-[#F2F4F7]" />
      <div className="mt-4 rounded-[22px] border border-[#EFF2F6] bg-[#FBFCFD] p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A1ABBA]">
          Prompt
        </div>
        <p className="mt-3 max-w-[250px] text-[13px] leading-5 text-[#4A5565]">
          Write a thought leadership post about the future of remote work, focusing on
          asynchronous communication...
        </p>
        <div className="mt-5 flex justify-end">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-[0_12px_24px_rgba(83,74,183,0.22)]">
            <Sparkles className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

function PublishOrbitVisual() {
  return (
    <div className="relative flex min-h-[190px] items-center justify-center overflow-hidden rounded-[28px] bg-[#FFFFFF]">
      <div className="absolute h-36 w-36 rounded-full border border-[#E9EDF2]" />
      <div className="absolute h-52 w-52 rounded-full border border-[#F1F3F6]" />
      <span className="absolute left-[22%] top-[47%] flex h-9 w-9 items-center justify-center rounded-full bg-[#FFFFFF] text-[#4D5870] shadow-[0_12px_30px_rgba(20,24,31,0.08)]">
        <FileText className="h-4 w-4" />
      </span>
      <span className="absolute right-[25%] top-[22%] flex h-9 w-9 items-center justify-center rounded-full bg-[#FFFFFF] text-[#4D5870] shadow-[0_12px_30px_rgba(20,24,31,0.08)]">
        <CalendarDays className="h-4 w-4" />
      </span>
      <span className="absolute bottom-[18%] right-[35%] flex h-9 w-9 items-center justify-center rounded-full bg-[#FFFFFF] text-[#4D5870] shadow-[0_12px_30px_rgba(20,24,31,0.08)]">
        <CheckCircle2 className="h-4 w-4" />
      </span>
      <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#FFFFFF] text-brand shadow-[0_18px_45px_rgba(20,24,31,0.12)]">
        <Play className="ml-1 h-6 w-6 fill-current" />
      </span>
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="px-5 pb-24 pt-4">
      <div className="mx-auto max-w-[860px]">
        <div className="mx-auto max-w-[650px] text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand">
            How it works
          </p>
          <h2 className="mt-4 text-balance text-[40px] font-extrabold leading-[1.05] tracking-[-0.06em] text-[#101218] sm:text-[52px]">
            Three steps to posting that sounds like you
          </h2>
          <p className="mx-auto mt-5 max-w-[570px] text-[14px] leading-6 text-[#465162]">
            Quill learns your cadence, vocabulary, and tone, then turns rough ideas into
            platform-ready drafts without losing your voice.
          </p>
        </div>

        <div className="mt-[58px] grid gap-[18px]">
          <article className="grid overflow-hidden rounded-[32px] border border-white bg-[#FFFFFF] p-8 shadow-[0_20px_60px_rgba(20,24,31,0.06)] md:grid-cols-[330px_1fr] md:p-9">
            <div className="flex flex-col justify-center md:pr-9">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6F7FA] text-[11px] font-bold text-brand">
                01
              </span>
              <h3 className="mt-8 text-[28px] font-extrabold leading-none tracking-[-0.055em] text-[#101218]">
                Train your voice
              </h3>
              <p className="mt-4 text-[14px] leading-6 text-[#465162]">
                Upload previous articles, notes, or posts. Quill analyzes your phrases, pacing,
                sentence rhythm, and structural preferences to create your Voice DNA.
              </p>
              <div className="mt-7 space-y-3 text-[13px] font-medium text-[#465162]">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                  Analyzes syntax and vocabulary
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                  Identifies pacing and rhythm
                </div>
              </div>
            </div>
            <AnalysisVisual />
          </article>

          <div className="grid gap-[18px] md:grid-cols-2">
            <article className="rounded-[32px] border border-white bg-[#FFFFFF] p-8 shadow-[0_18px_50px_rgba(20,24,31,0.055)]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6F7FA] text-[11px] font-bold text-brand">
                02
              </span>
              <h3 className="mt-8 text-[26px] font-extrabold leading-none tracking-[-0.055em] text-[#101218]">
                Write your post
              </h3>
              <p className="mt-4 text-[14px] leading-6 text-[#465162]">
                Provide a simple prompt or bullet points. Draft Studio expands your idea using
                your established Voice DNA.
              </p>
              <div className="mt-9">
                <ComposerVisual />
              </div>
            </article>

            <article className="rounded-[32px] border border-white bg-[#FFFFFF] p-8 shadow-[0_18px_50px_rgba(20,24,31,0.055)]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6F7FA] text-[11px] font-bold text-brand">
                03
              </span>
              <h3 className="mt-8 text-[26px] font-extrabold leading-none tracking-[-0.055em] text-[#101218]">
                Publish everywhere
              </h3>
              <p className="mt-4 text-[14px] leading-6 text-[#465162]">
                Review, tweak, and distribute directly to connected platforms while keeping your
                message consistent.
              </p>
              <div className="mt-9">
                <PublishOrbitVisual />
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.onboardingCompleted ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F4F6F7] text-[#090B10]">
      <PublicNav />

      <section id="product" className="px-5 pb-[128px] pt-[148px]">
        <div className="mx-auto max-w-[860px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E1E6EE] bg-[#FFFFFF] px-3 py-1.5 shadow-[0_8px_22px_rgba(20,24,31,0.06)]">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            <span className="text-[10px] font-semibold tracking-[0.14em] text-[#4B5870]">
              Introducing Draft Studio 2.0
            </span>
          </div>

          <h1 className="mx-auto mt-8 max-w-[610px] text-balance text-[42px] font-extrabold leading-[1.12] tracking-[-0.06em] text-[#101218] sm:text-[52px]">
            Write once.
            <span className="block text-brand">Sound like you.</span>
            Publish everywhere.
          </h1>

          <p className="mx-auto mt-7 max-w-[470px] text-pretty text-[15px] leading-7 text-[#465162]">
            Quill AI learns your unique writing voice and automatically optimizes your drafts for
            LinkedIn, X, and beyond. Stop rewriting, start creating.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <StartButton label="Join free beta" />
            <a
              href="#features"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#FFFFFF] px-6 text-sm font-semibold text-[#101218] shadow-[0_18px_45px_rgba(20,24,31,0.1)] transition hover:-translate-y-0.5 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              See how it works
            </a>
          </div>

          <ProductMockup />
        </div>
      </section>

      <section id="features" className="px-5 pb-20 pt-[92px]">
        <div className="mx-auto max-w-[860px]">
          <div className="mx-auto max-w-[560px] text-center">
            <h2 className="text-balance text-[42px] font-extrabold leading-[1.04] tracking-[-0.06em] text-[#101218] sm:text-[50px]">
              Pristine power.
              <span className="block">Effortless creation.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-[520px] text-[14px] leading-6 text-[#465162]">
              Experience a drafting environment designed for clarity. Quill AI integrates deep
              intelligence with a remarkably quiet interface, letting your ideas take the foreground.
            </p>
          </div>

          <div className="mt-[58px] grid gap-[18px]">
            <article className="grid min-h-[386px] overflow-hidden rounded-[30px] border border-white bg-[#FFFFFF] p-[34px] shadow-[0_20px_60px_rgba(20,24,31,0.065)] md:grid-cols-[382px_1fr] md:p-[48px]">
              <div className="flex flex-col justify-center md:pr-8">
                <div className="mb-[54px] flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#30384A] bg-[#FFFFFF] text-brand shadow-[0_14px_28px_rgba(20,24,31,0.06)]">
                  <Fingerprint className="h-[25px] w-[25px]" />
                </div>
                <h3 className="text-[26px] font-extrabold leading-none tracking-[-0.055em] text-[#101218]">
                  Voice DNA
                </h3>
                <p className="mt-7 max-w-[360px] text-[15px] leading-[2.05] text-[#8A97AA]">
                  Quill studies your past content to build a linguistic profile. Every draft gets
                  checked against your tone, sentence rhythm, and vocabulary before publishing.
                </p>
              </div>
              <VoiceWaveVisual />
            </article>

            <div className="grid gap-[18px] md:grid-cols-[1.35fr_0.95fr]">
              <article className="min-h-[255px] rounded-[30px] border border-white bg-[#FFFFFF] p-8 shadow-[0_18px_50px_rgba(20,24,31,0.055)]">
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#F7F9FA] text-brand">
                  <PenLine className="h-[18px] w-[18px]" />
                </div>
                <h3 className="mt-10 text-[18px] font-semibold tracking-[-0.04em] text-[#101218]">
                  One editor, all platforms
                </h3>
                <p className="mt-3 max-w-[420px] text-[13px] leading-5 text-[#465162]">
                  Draft once, adapt endlessly. Quill AI instantly reformats your core message for
                  Twitter, LinkedIn, newsletters, and more, optimizing length and tone for each
                  medium without losing the original intent.
                </p>
                <div className="mt-[58px] flex flex-wrap gap-2">
                  {platformChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full bg-[#F4F6F8] px-3 py-1 text-[10px] font-semibold text-[#8A97AA] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </article>

              <article className="min-h-[255px] rounded-[30px] border border-white bg-[#FFFFFF] p-8 shadow-[0_18px_50px_rgba(20,24,31,0.055)]">
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#F7F9FA] text-brand">
                  <LockKeyhole className="h-[18px] w-[18px]" />
                </div>
                <h3 className="mt-10 text-[18px] font-semibold tracking-[-0.04em] text-[#101218]">
                  Text post scheduling
                </h3>
                <p className="mt-3 text-[13px] leading-5 text-[#465162]">
                  Seamlessly transition from creation to distribution. Queue your perfected drafts
                  directly within the studio.
                </p>
                <div className="mt-8">
                  <MiniSchedule />
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <HowItWorks />

      <section id="pricing" className="px-5 pb-20">
        <div className="mx-auto max-w-[860px] rounded-[30px] border border-white bg-[#FFFFFF] p-9 text-center shadow-[0_18px_55px_rgba(20,24,31,0.055)]">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-light text-brand">
            <Send className="h-4 w-4" />
          </div>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A97AA]">
            Free during beta
          </p>
          <h2 className="mx-auto mt-3 max-w-[560px] text-balance text-[32px] font-extrabold leading-[1.08] tracking-[-0.055em] text-[#101218]">
            The full Quill AI workflow is open while we refine the product.
          </h2>
          <p className="mx-auto mt-4 max-w-[500px] text-[14px] leading-6 text-[#465162]">
            No card required. Early users get Voice DNA scoring, LinkedIn and X publishing, ideas,
            and carousel tooling during beta.
          </p>
          <div className="mt-7 flex justify-center">
            <StartButton label="Join free beta" />
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E2E7EE] bg-[#FFFFFF]/45 px-5 py-9">
        <div className="mx-auto flex max-w-[860px] flex-col gap-5 text-[10px] uppercase tracking-[0.28em] text-[#8A97AA] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Quill AI. Pristine dimensionality.</p>
          <div className="flex flex-wrap gap-7">
            <Link href="/privacy-policy" className="transition hover:text-brand">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-brand">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
