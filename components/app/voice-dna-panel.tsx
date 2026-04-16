"use client";

import Link from "next/link";
import { Activity, CheckCircle2, Mic, Sparkles, TriangleAlert, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceScoreBadge, getVoiceScoreTone } from "@/components/app/voice-score-badge";
import type { VoiceDimensions, VoiceProfileStrength } from "@/lib/voice-foundations";

type VoiceScoreState = {
  score: number | null;
  toneScore?: number | null;
  rhythmScore?: number | null;
  wordChoiceScore?: number | null;
  feedback: string;
  tip: string;
  signaturePhrases?: string[];
  safeToPublish?: boolean;
  weakestSentence: string;
  suggestions: string[];
  traits: string[];
  summary?: string | null;
};

function BreakdownRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mic;
  label: string;
  value?: number | null;
}) {
  const percentage = Math.max(0, Math.min(100, value ?? 0));
  const tone = getVoiceScoreTone(value);

  return (
    <div className="rounded-xl border border-line bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">{label}</p>
            <p className="text-xs text-muted">{tone.label}</p>
          </div>
        </div>
        <span className="text-sm font-semibold text-ink">{value ?? "—"}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: tone.ring }}
        />
      </div>
    </div>
  );
}

export function VoiceDnaPanel({
  voice,
  profileDimensions,
  profileStrength,
  loadingScore,
  rewriteLoading,
  animateScore,
  onRewrite,
  onApplySuggestion,
}: {
  voice: VoiceScoreState;
  profileDimensions?: VoiceDimensions | null;
  profileStrength?: VoiceProfileStrength | null;
  loadingScore: boolean;
  rewriteLoading: boolean;
  animateScore: boolean;
  onRewrite: () => void;
  onApplySuggestion: (suggestion: string) => void;
}) {
  const hasVoiceProfile = Boolean(profileDimensions || profileStrength);

  return (
    <aside className="quill-card p-6 xl:sticky xl:top-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Voice check
          </p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Voice DNA</h2>
          <p className="mt-1 text-sm text-muted">
            {loadingScore
              ? "Checking how the current draft matches your voice..."
              : "A supporting quality check while you write and refine."}
          </p>
        </div>
        {hasVoiceProfile && (
          <div className="flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            {profileStrength?.label ?? "Profile loaded"}
          </div>
        )}
      </div>

      {hasVoiceProfile ? (
        <>
          {profileStrength && (
            <div
              className={`mt-6 rounded-2xl border px-4 py-4 text-sm leading-6 ${
                profileStrength.state === "weak"
                  ? "border-red-200 bg-red-50"
                  : profileStrength.state === "forming"
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <p className="font-medium text-ink">{profileStrength.label}</p>
              <p className="mt-1 text-muted">{profileStrength.note}</p>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-line bg-slate-50 p-4">
            <VoiceScoreBadge
              score={voice.score}
              toneScore={voice.toneScore}
              rhythmScore={voice.rhythmScore}
              wordChoiceScore={voice.wordChoiceScore}
              safeToPublish={voice.safeToPublish}
              variant="pill"
              animate={animateScore}
            />
          </div>

          <div className="mt-4 grid gap-3">
            <BreakdownRow icon={Mic} label="Tone match" value={voice.toneScore} />
            <BreakdownRow icon={Activity} label="Sentence rhythm" value={voice.rhythmScore} />
            <BreakdownRow icon={Type} label="Word choice" value={voice.wordChoiceScore} />
          </div>

          {profileDimensions && (
            <div className="mt-6 rounded-2xl border border-line bg-white p-4">
              <h3 className="text-sm font-semibold text-ink">How you usually write</h3>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Hooks</p>
                  <p className="mt-2 leading-6 text-ink">{profileDimensions.hookStyle}</p>
                </div>
                <div className="rounded-xl border border-line bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Paragraphs</p>
                  <p className="mt-2 leading-6 text-ink">{profileDimensions.paragraphStyle}</p>
                </div>
                <div className="rounded-xl border border-line bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Story vs teaching</p>
                  <p className="mt-2 leading-6 text-ink">{profileDimensions.storytellingVsTeaching}</p>
                </div>
                <div className="rounded-xl border border-line bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Language</p>
                  <p className="mt-2 leading-6 text-ink">{profileDimensions.languageStyle}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-line bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              {voice.safeToPublish ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <TriangleAlert className="h-4 w-4 text-amber-600" />
              )}
              {voice.safeToPublish ? "Quality check passed" : "One more pass will help"}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{voice.feedback}</p>
            {voice.tip && <p className="mt-2 text-sm leading-6 text-muted">{voice.tip}</p>}
          </div>

          {(voice.signaturePhrases?.length ?? 0) > 0 ? (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">Signature phrases detected</h3>
                <span className="text-xs text-muted">
                  {voice.signaturePhrases?.length ?? 0} matched
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {voice.signaturePhrases?.map((phrase) => (
                  <span
                    key={phrase}
                    className="rounded-full border border-brand/15 bg-brand-light px-3 py-1 text-xs font-medium text-brand"
                  >
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {voice.suggestions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-ink">Make it sound more like me</h3>
              <ol className="mt-3 space-y-3">
                {voice.suggestions.map((suggestion, index) => (
                  <li
                    key={`${index}-${suggestion}`}
                    className="rounded-xl border border-line bg-white px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3 text-sm leading-6 text-muted">
                        <span className="font-semibold text-ink">{index + 1}.</span>
                        <span>{suggestion}</span>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 px-3 py-1 text-xs"
                        onClick={() => onApplySuggestion(suggestion)}
                      >
                        Apply
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={onRewrite}
            disabled={rewriteLoading}
          >
            {rewriteLoading ? "Refining..." : "Refine in my voice"}
          </Button>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-brand/30 bg-brand-light/40 p-4 text-sm leading-6 text-muted">
          Set up Voice DNA first so Quill can generate from ideas, rewrite rough notes, refine
          drafts, and run live authenticity checks in your voice.{" "}
          <Link href="/voice-dna" className="font-medium text-brand hover:underline">
            Go to Voice DNA
          </Link>
        </div>
      )}
    </aside>
  );
}
