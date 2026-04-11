import { CalendarClock, CheckCheck, Fingerprint, Sparkles } from 'lucide-react'

const scoreRows = [
  { label: 'Tone match', value: '94%' },
  { label: 'Sentence rhythm', value: '89%' },
  { label: 'Word choice', value: '91%' },
]

const platformPreviews = [
  {
    platform: 'LinkedIn',
    accent: 'bg-sky-500',
    copy:
      'Your best content does not need to sound robotic to scale. Quill helps me keep my voice while posting consistently.',
  },
  {
    platform: 'X',
    accent: 'bg-slate-900',
    copy:
      'Quill catches the parts that stop a draft from sounding like me and fixes them before I hit publish.',
  },
]

export default function AppMockup() {
  return (
    <section className="pb-20 md:pb-28 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_30px_80px_-40px_rgba(58,61,117,0.45)]">
          <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-4 text-xs text-muted-foreground">app.quill.so</span>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.5fr_1fr]">
            <div className="border-b border-border bg-gradient-to-br from-white via-white to-accent/40 p-6 lg:border-b-0 lg:border-r">
              <div className="rounded-3xl border border-border/80 bg-white/95 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                      Draft Studio
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">
                      Ship one idea across every channel
                    </h3>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Voice DNA live
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">Post draft</p>
                      <p className="max-w-xl text-sm leading-7 text-slate-600">
                        Most creator tools optimize for volume. I care more about consistency.
                        If my writing loses the texture of how I actually speak, I would rather
                        post less often and keep the trust.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm ring-1 ring-slate-200">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        Score
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">92</p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-primary to-sky-400" />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <Fingerprint className="h-4 w-4 text-primary" />
                        Signature phrases
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        “texture of how I speak” detected
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <CheckCheck className="h-4 w-4 text-emerald-500" />
                        Safe to publish
                      </div>
                      <p className="mt-2 text-sm text-slate-600">Matches your prior top posts</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <CalendarClock className="h-4 w-4 text-amber-500" />
                        Best window
                      </div>
                      <p className="mt-2 text-sm text-slate-600">Tomorrow, 8:30 AM local time</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {platformPreviews.map((preview) => (
                    <div
                      key={preview.platform}
                      className="rounded-2xl border border-border bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${preview.accent}`} />
                        <span className="text-sm font-medium text-slate-900">
                          {preview.platform} preview
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{preview.copy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-6 text-white">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/80">
                  Voice DNA Panel
                </p>
                <h3 className="mt-3 text-2xl font-semibold">Protected brand voice</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Quill continuously checks whether each draft still sounds recognizably like
                  you before it reaches a scheduler.
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
      </div>
    </section>
  )
}
