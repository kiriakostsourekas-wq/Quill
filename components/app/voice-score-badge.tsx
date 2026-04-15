"use client";

import { Activity, Mic, ShieldCheck, Type } from "lucide-react";
import { cn } from "@/lib/utils";

type VoiceScoreBadgeProps = {
  score?: number | null;
  toneScore?: number | null;
  rhythmScore?: number | null;
  wordChoiceScore?: number | null;
  safeToPublish?: boolean | null;
  variant?: "pill" | "hero" | "compact";
  className?: string;
  animate?: boolean;
};

export function getVoiceScoreTone(score?: number | null) {
  if (score == null) {
    return {
      label: "Unscored",
      ring: "#CBD5E1",
      text: "text-slate-500 dark:text-slate-300",
      bg: "bg-slate-100 dark:bg-surface-soft",
      border: "border-slate-200 dark:border-line",
      soft: "bg-slate-50 dark:bg-surface-muted",
    };
  }

  if (score >= 90) {
    return {
      label: "Safe zone",
      ring: "#10B981",
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      soft: "bg-emerald-50/70",
    };
  }

  if (score >= 70) {
    return {
      label: "Needs polish",
      ring: "#F59E0B",
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      soft: "bg-amber-50/70",
    };
  }

  return {
    label: "Off voice",
    ring: "#EF4444",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    soft: "bg-red-50/70",
  };
}

function BreakdownIcon({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mic;
  label: string;
  value?: number | null;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <span>{value ?? "—"}</span>
    </span>
  );
}

export function VoiceScoreBadge({
  score,
  toneScore,
  rhythmScore,
  wordChoiceScore,
  safeToPublish,
  variant = "pill",
  className,
  animate = false,
}: VoiceScoreBadgeProps) {
  const tone = getVoiceScoreTone(score);
  const progress = Math.max(0, Math.min(100, score ?? 0));

  if (variant === "hero") {
    return (
      <div className={cn("flex flex-col items-center gap-4", className)}>
        <div
          className={cn(
            "relative flex h-36 w-36 items-center justify-center rounded-full p-[10px] transition-all duration-500",
            animate && "scale-[1.03]"
          )}
          style={{
            background: `conic-gradient(${tone.ring} ${progress * 3.6}deg, #E5E7EB ${
              progress * 3.6
            }deg)`,
          }}
          aria-label={`Voice DNA score ${score ?? "unscored"}`}
        >
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
            <span className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", tone.text)}>
              Voice DNA
            </span>
            <span className="mt-1 text-4xl font-semibold text-ink">{score ?? "—"}</span>
            <span className="mt-1 text-xs text-muted">{tone.label}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <BreakdownIcon icon={Mic} label="Tone" value={toneScore} />
          <BreakdownIcon icon={Activity} label="Rhythm" value={rhythmScore} />
          <BreakdownIcon icon={Type} label="Word choice" value={wordChoiceScore} />
        </div>

        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
            safeToPublish
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300"
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          {safeToPublish ? "Safe to publish" : "Needs one more pass"}
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 shadow-sm transition-all duration-300",
          tone.bg,
          tone.border,
          animate && "scale-[1.02]",
          className
        )}
      >
        <span
          className={cn(
            "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
            tone.soft,
            tone.text
          )}
        >
          {score ?? "—"}
        </span>
        <div className="flex items-center gap-1">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-slate-600 dark:bg-white/10 dark:text-slate-300">
            <Mic className="h-3 w-3" />
          </span>
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-slate-600 dark:bg-white/10 dark:text-slate-300">
            <Activity className="h-3 w-3" />
          </span>
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-slate-600 dark:bg-white/10 dark:text-slate-300">
            <Type className="h-3 w-3" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-full border px-3 py-2 shadow-sm transition-all duration-300",
        tone.bg,
        tone.border,
        animate && "scale-[1.02]",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold",
          tone.soft,
          tone.text
        )}
      >
        {score ?? "—"}
      </span>
      <span className="text-xs font-medium text-ink">Voice DNA</span>
      <div className="flex items-center gap-1">
        <BreakdownIcon icon={Mic} label="Tone" value={toneScore} />
        <BreakdownIcon icon={Activity} label="Rhythm" value={rhythmScore} />
        <BreakdownIcon icon={Type} label="Word choice" value={wordChoiceScore} />
      </div>
    </div>
  );
}
