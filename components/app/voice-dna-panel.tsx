"use client";

import Link from "next/link";
import { Activity, CheckCircle2, Mic, Sparkles, TriangleAlert, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceScoreBadge, getVoiceScoreTone } from "@/components/app/voice-score-badge";

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
  loadingScore,
  rewriteLoading,
  animateScore,
  onRewrite,
  onApplySuggestion,
}: {
  voice: VoiceScoreState;
  loadingScore: boolean;
  rewriteLoading: boolean;
  animateScore: boolean;
  onRewrite: () => void;
  onApplySuggestion: (suggestion: string) => void;
}) {
  const hasVoiceProfile = Boolean(voice.traits && voice.traits.length > 0);

  return (
    <aside className="quill-card p-6 xl:sticky xl:top-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Hero feature
          </p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Voice DNA</h2>
          <p className="mt-1 text-sm text-muted">
            {loadingScore
              ? "Re-scoring your draft live..."
              : "Live authenticity scoring based on your personal writing profile."}
          </p>
        </div>
        {hasVoiceProfile && (
          <div className="flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            {voice.traits.slice(0, 2).join(" · ") || "Profile loaded"}
          </div>
        )}
      </div>

      {hasVoiceProfile ? (
        <>
          <div className="mt-8">
            <VoiceScoreBadge
              score={voice.score}
              toneScore={voice.toneScore}
              rhythmScore={voice.rhythmScore}
              wordChoiceScore={voice.wordChoiceScore}
              safeToPublish={voice.safeToPublish}
              variant="hero"
              animate={animateScore}
            />
          </div>

          <div className="mt-6 grid gap-3">
            <BreakdownRow icon={Mic} label="Tone match" value={voice.toneScore} />
            <BreakdownRow icon={Activity} label="Sentence rhythm" value={voice.rhythmScore} />
            <BreakdownRow icon={Type} label="Word choice" value={voice.wordChoiceScore} />
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              {voice.safeToPublish ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <TriangleAlert className="h-4 w-4 text-amber-600" />
              )}
              {voice.safeToPublish ? "Safe to Publish" : "Give this one more pass"}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{voice.feedback}</p>
            {voice.tip && <p className="mt-2 text-sm leading-6 text-muted">{voice.tip}</p>}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">Signature phrases detected</h3>
              <span className="text-xs text-muted">
                {voice.signaturePhrases?.length ?? 0} matched
              </span>
            </div>
            {voice.signaturePhrases && voice.signaturePhrases.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {voice.signaturePhrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="rounded-full border border-brand/15 bg-brand-light px-3 py-1 text-xs font-medium text-brand"
                  >
                    {phrase}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">
                No signature phrases detected yet. Add a sharper phrase or a line you naturally
                repeat in your strongest posts.
              </p>
            )}
          </div>

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
            {rewriteLoading ? "Rewriting..." : "Make it sound more like me"}
          </Button>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-brand/30 bg-brand-light/40 p-4 text-sm leading-6 text-muted">
          Set up Voice DNA to unlock live scoring, authenticity breakdowns, and signature-phrase
          detection.{" "}
          <Link href="/voice-dna" className="font-medium text-brand hover:underline">
            Go to Voice DNA
          </Link>
        </div>
      )}
    </aside>
  );
}
