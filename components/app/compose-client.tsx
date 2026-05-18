"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignLeft,
  Calendar,
  CalendarRange,
  Check,
  LayoutTemplate,
  Lightbulb,
  ListTree,
  Loader2,
  PenSquare,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarClient } from "@/components/app/calendar-client";
import { KeyboardHint } from "@/components/app/keyboard-hint";
import { ScheduledClient } from "@/components/app/scheduled-client";
import { VoiceScoreBadge } from "@/components/app/voice-score-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatLinkedInPostSpacing } from "@/lib/post-formatting";
import {
  getVoiceDimensions,
  getVoiceProfileStrength,
  type VoiceProfileSampleSignal,
  type VoiceDimensions,
  type VoiceProfileStrength,
} from "@/lib/voice-foundations";
import {
  AUTO_SCHEDULING_ENABLED,
} from "@/lib/scheduling";

type VoiceScore = {
  score: number | null;
  toneScore: number | null;
  rhythmScore: number | null;
  wordChoiceScore: number | null;
  feedback: string;
  tip: string;
  signaturePhrases: string[];
  safeToPublish: boolean;
  weakestSentence: string;
  suggestions: string[];
  traits: string[];
  summary?: string | null;
};

type VoiceProfileSummary = {
  setupSource?: string | null;
  foundationKey?: string | null;
  sampleSignal?: Partial<VoiceProfileSampleSignal> | null;
  traits: string[];
  dimensions?: VoiceDimensions | null;
  summary?: string | null;
};

type PlatformMode = "linkedin" | "twitter" | "both";
type PublishPlatform = "linkedin" | "twitter";
type WritingMode = "idea" | "notes" | "draft";
type ComposeWorkspaceMode = "compose" | "scheduled";
type ScheduledWorkspaceView = "list" | "calendar";
type DraftOutputTransform = (value: string) => string;
type ComposeSuccessState =
  | {
      kind: "published";
      platforms: PublishPlatform[];
    }
  | {
      kind: "scheduled";
      scheduledAt: string;
    };

const platformTabs: { label: string; value: PlatformMode }[] = [
  { label: "LinkedIn", value: "linkedin" },
  { label: "X", value: "twitter" },
  { label: "Both", value: "both" },
];

const writingModes: {
  value: WritingMode;
  label: string;
  shortLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  placeholder: string;
  icon: typeof Lightbulb;
  actionLabel: string;
}[] = [
  {
    value: "idea",
    label: "Start from an idea",
    shortLabel: "Idea",
    eyebrow: "Workflow 1",
    title: "Turn a topic into a first draft in your voice",
    description:
      "Drop in a topic, hook, or angle. Quill will write the first pass in your tone so you can shape it faster.",
    placeholder: "Example: A post about why consistency beats hacks when you're building a personal brand.",
    icon: Lightbulb,
    actionLabel: "Generate in my voice",
  },
  {
    value: "notes",
    label: "Rewrite rough notes",
    shortLabel: "Notes",
    eyebrow: "Workflow 2",
    title: "Transform bullets into a polished post",
    description:
      "Paste fragments, bullets, or half-formed thoughts. Quill will turn them into something publishable in your voice.",
    placeholder:
      "Example:\n- launched feature late because quality mattered\n- customers noticed the extra polish\n- lesson: speed matters, but trust matters more",
    icon: ListTree,
    actionLabel: "Generate in my voice",
  },
  {
    value: "draft",
    label: "Improve existing draft",
    shortLabel: "Draft",
    eyebrow: "Workflow 3",
    title: "Refine a draft without sanding off your voice",
    description:
      "Bring a rough draft into the editor below, then let Quill tighten the structure, phrasing, and clarity while keeping it yours.",
    placeholder: "",
    icon: Sparkles,
    actionLabel: "Improve in my voice",
  },
];

const emptyVoiceState: VoiceScore = {
  score: null,
  toneScore: null,
  rhythmScore: null,
  wordChoiceScore: null,
  feedback: "Start writing to score your post.",
  tip: "",
  signaturePhrases: [],
  safeToPublish: false,
  weakestSentence: "",
  suggestions: [],
  traits: [],
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function findSentenceRange(text: string, sentence: string) {
  if (!sentence) return null;

  const directIndex = text.indexOf(sentence);
  if (directIndex !== -1) {
    return {
      start: directIndex,
      end: directIndex + sentence.length,
    };
  }

  const normalizedTarget = sentence.trim().replace(/\s+/g, " ");
  const matches = Array.from(text.matchAll(/[^.!?\n]+(?:[.!?]+|$)/g));

  for (const match of matches) {
    const value = match[0] ?? "";
    if (value.trim().replace(/\s+/g, " ") === normalizedTarget) {
      return {
        start: match.index ?? 0,
        end: (match.index ?? 0) + value.length,
      };
    }
  }

  return null;
}

function replaceWeakestSentence(text: string, weakestSentence: string, replacement: string) {
  const range = findSentenceRange(text, weakestSentence);
  if (!range) return text;
  return `${text.slice(0, range.start)}${replacement}${text.slice(range.end)}`;
}

function buildHighlightMarkup(text: string, weakestSentence: string) {
  const range = findSentenceRange(text, weakestSentence);
  if (!range) {
    return `${escapeHtml(text)}\n`;
  }

  const before = escapeHtml(text.slice(0, range.start));
  const target = escapeHtml(text.slice(range.start, range.end));
  const after = escapeHtml(text.slice(range.end));

  return `${before}<mark class="rounded-sm bg-amber-100/70 decoration-amber-500 underline decoration-[3px] underline-offset-4 dark:bg-amber-300/20 dark:decoration-amber-300">${target}</mark>${after}\n`;
}

function getProfileStrengthClasses(state?: VoiceProfileStrength["state"]) {
  if (state === "weak") return "border-red-200 bg-red-50 text-red-700";
  if (state === "forming") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function scoreValue(value?: number | null) {
  return value == null ? "—" : `${value}%`;
}

function CompactVoiceDnaRail({
  voice,
  profileDimensions,
  profileStrength,
  loadingScore,
  rewriteLoading,
  animateScore,
  canRefine,
  onRewrite,
  onApplySuggestion,
}: {
  voice: VoiceScore;
  profileDimensions?: VoiceDimensions | null;
  profileStrength?: VoiceProfileStrength | null;
  loadingScore: boolean;
  rewriteLoading: boolean;
  animateScore: boolean;
  canRefine: boolean;
  onRewrite: () => void;
  onApplySuggestion: (suggestion: string) => void;
}) {
  const hasVoiceProfile = Boolean(profileDimensions || profileStrength);
  const profileLabel = profileStrength?.label ?? (hasVoiceProfile ? "Profile loaded" : null);
  const canRunRefine = canRefine && !voice.safeToPublish;
  const metricRows = [
    ["Tone", voice.toneScore],
    ["Rhythm", voice.rhythmScore],
    ["Word choice", voice.wordChoiceScore],
  ] as const;

  return (
    <aside className="quill-card p-4 xl:sticky xl:top-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Voice check
          </p>
          <h2 className="mt-1 text-lg font-semibold text-ink">Voice DNA</h2>
        </div>
        {profileLabel && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
              getProfileStrengthClasses(profileStrength?.state)
            )}
          >
            {profileLabel}
          </span>
        )}
      </div>

      {hasVoiceProfile ? (
        <>
          <div className="mt-4 space-y-3">
            <VoiceScoreBadge
              score={voice.score}
              toneScore={voice.toneScore}
              rhythmScore={voice.rhythmScore}
              wordChoiceScore={voice.wordChoiceScore}
              safeToPublish={voice.safeToPublish}
              variant="pill"
              animate={animateScore}
              className="w-full justify-between"
            />
            <p className="text-sm leading-6 text-muted">
              {loadingScore
                ? "Checking the current draft against your voice..."
                : voice.feedback}
            </p>
            {profileStrength?.note && (
              <p className="text-xs leading-5 text-muted">{profileStrength.note}</p>
            )}
          </div>

            <Button
              className="mt-4 w-full"
              onClick={onRewrite}
              disabled={rewriteLoading || !canRunRefine}
            >
              {rewriteLoading
                ? "Refining..."
                : voice.safeToPublish
                  ? "Voice match looks good"
                  : "Refine in my voice"}
            </Button>

            {!voice.safeToPublish && voice.suggestions.length > 0 && (
              <div className="mt-4 border-t border-line pt-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-ink">Suggested edits</h3>
                  <span className="text-xs text-muted">{voice.suggestions.length}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {voice.suggestions.slice(0, 2).map((suggestion, index) => (
                    <div
                      key={`${index}-${suggestion}`}
                      className="rounded-lg border border-line bg-slate-50 px-3 py-3"
                    >
                      <p className="text-sm leading-5 text-muted">{suggestion}</p>
                      <Button
                        variant="outline"
                        className="mt-3 h-8 px-3 text-xs"
                        onClick={() => onApplySuggestion(suggestion)}
                      >
                        Apply
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          <details className="mt-4 border-t border-line pt-4">
            <summary className="cursor-pointer text-sm font-medium text-ink">
              Details and traits
            </summary>
            <div className="mt-3 space-y-4 text-sm">
              <div className="grid gap-2">
                {metricRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span className="text-muted">{label}</span>
                    <span className="font-medium text-ink">{scoreValue(value)}</span>
                  </div>
                ))}
              </div>

              {voice.signaturePhrases.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    Signature phrases
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {voice.signaturePhrases.map((phrase) => (
                      <span
                        key={phrase}
                        className="rounded-full border border-brand/15 bg-brand-light px-2.5 py-1 text-xs font-medium text-brand"
                      >
                        {phrase}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profileDimensions && (
                <div className="space-y-3">
                  {[
                    ["Hooks", profileDimensions.hookStyle],
                    ["Paragraphs", profileDimensions.paragraphStyle],
                    ["Story vs teaching", profileDimensions.storytellingVsTeaching],
                    ["Language", profileDimensions.languageStyle],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        {label}
                      </p>
                      <p className="mt-1 leading-6 text-ink">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {voice.tip && <p className="leading-6 text-muted">{voice.tip}</p>}
            </div>
          </details>
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-brand/30 bg-brand-light/40 p-4 text-sm leading-6 text-muted">
          Set up Voice DNA first so Quill can generate, refine, and score drafts in your voice.{" "}
          <Link href="/voice-dna" className="font-medium text-brand hover:underline">
            Go to Voice DNA
          </Link>
        </div>
      )}
    </aside>
  );
}

export function ComposeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeWorkspace: ComposeWorkspaceMode =
    searchParams.get("workspace") === "scheduled" ? "scheduled" : "compose";
  const scheduledWorkspaceView: ScheduledWorkspaceView =
    searchParams.get("queueView") === "calendar" ? "calendar" : "list";
  const postId = searchParams.get("postId");
  const ideaPrefill = searchParams.get("idea");
  const scheduledAtPrefill = searchParams.get("scheduledAt");
  const [writingMode, setWritingMode] = useState<WritingMode>(postId ? "draft" : ideaPrefill ? "idea" : "idea");
  const [platform, setPlatform] = useState<PlatformMode>("both");
  const [ideaInput, setIdeaInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [content, setContent] = useState("");
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfileSummary | null>(null);
  const [voice, setVoice] = useState<VoiceScore>(emptyVoiceState);
  const [loadingScore, setLoadingScore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [firstCommentOpen, setFirstCommentOpen] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [successState, setSuccessState] = useState<ComposeSuccessState | null>(null);
  const [showIdeaBanner, setShowIdeaBanner] = useState(false);
  const [animateScore, setAnimateScore] = useState(false);
  const [loadingExistingPost, setLoadingExistingPost] = useState(Boolean(postId));
  const [loadPostError, setLoadPostError] = useState<string | null>(null);
  const [shortcutModifier, setShortcutModifier] = useState("Ctrl");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  const readResponseError = useCallback(async (response: Response, fallback: string) => {
    try {
      const data = await response.json();
      return data.error ?? fallback;
    } catch {
      return fallback;
    }
  }, []);

  useEffect(() => {
    if (/(Mac|iPhone|iPad)/i.test(navigator.platform)) {
      setShortcutModifier("⌘");
    }
  }, []);

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.json())
      .then((data) => {
        setVoiceProfile(data.user?.voiceProfile ?? null);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!postId) {
      setLoadingExistingPost(false);
      setLoadPostError(null);
      return;
    }

    let cancelled = false;
    setLoadingExistingPost(true);
    setLoadPostError(null);

    fetch("/api/posts")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readResponseError(response, "Unable to load this draft"));
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const post = (data.posts ?? []).find((item: { id: string }) => item.id === postId);
        if (!post) {
          throw new Error("This draft no longer exists or you no longer have access to it.");
        }
        setContent(post.content ?? "");
        setFirstComment(post.firstComment ?? "");
        setFirstCommentOpen(Boolean(post.firstComment));
        if (post.scheduledAt) {
          setScheduledAt(new Date(post.scheduledAt).toISOString().slice(0, 16));
        }
        const mode =
          post.platforms?.length === 2
            ? "both"
            : post.platforms?.includes("linkedin")
              ? "linkedin"
              : "twitter";
        setPlatform(mode);
        setWritingMode("draft");
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadPostError(error instanceof Error ? error.message : "Unable to load this draft");
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingExistingPost(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId, readResponseError]);

  useEffect(() => {
    if (postId || !ideaPrefill) {
      setShowIdeaBanner(false);
      return;
    }

    setWritingMode("idea");
    setIdeaInput(ideaPrefill);
    setShowIdeaBanner(true);
    setPlatform("linkedin");
  }, [ideaPrefill, postId]);

  useEffect(() => {
    if (postId || !scheduledAtPrefill || !AUTO_SCHEDULING_ENABLED) return;

    const prefillDate = new Date(scheduledAtPrefill);
    if (Number.isNaN(prefillDate.getTime())) return;

    setScheduledAt(new Date(prefillDate.getTime() - prefillDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setScheduleOpen(true);
    setPlatform("linkedin");
  }, [postId, scheduledAtPrefill]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!content.trim()) {
      setVoice(emptyVoiceState);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoadingScore(true);
        const response = await fetch("/api/voice/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error ?? "Unable to score this draft right now.");
        }
        setVoice(result);
      } catch (error) {
        setVoice({
          score: null,
          toneScore: null,
          rhythmScore: null,
          wordChoiceScore: null,
          feedback:
            error instanceof Error
              ? error.message
              : "Unable to score this draft right now.",
          tip: "",
          signaturePhrases: [],
          safeToPublish: false,
          weakestSentence: "",
          suggestions: [],
          traits: [],
        });
      } finally {
        setLoadingScore(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content]);

  useEffect(() => {
    if (voice.score == null) return;

    setAnimateScore(true);
    const timeout = setTimeout(() => setAnimateScore(false), 450);
    return () => clearTimeout(timeout);
  }, [voice.score, voice.toneScore, voice.rhythmScore, voice.wordChoiceScore]);

  useEffect(() => {
    if (!successState) return;

    successTimerRef.current = setTimeout(() => {
      setSuccessState(null);
    }, 4000);

    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, [successState]);

  function syncHighlightScroll() {
    if (!textareaRef.current || !highlightRef.current) return;
    highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
  }

  function formatPlatformLabel(platforms: PublishPlatform[]) {
    if (platforms.length === 2) return "LinkedIn and X";
    return platforms[0] === "twitter" ? "X" : "LinkedIn";
  }

  const clearComposeState = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }

    setContent("");
    setIdeaInput("");
    setNotesInput("");
    setFirstComment("");
    setFirstCommentOpen(false);
    setWritingMode("idea");
    setPlatform("linkedin");
    setVoice(emptyVoiceState);
    setScheduleOpen(false);
    setScheduledAt("");
    setLoadingScore(false);
    setRewriteLoading(false);
    setCopilotLoading(false);
    setShowIdeaBanner(false);

    if (postId || scheduledAtPrefill || ideaPrefill) {
      router.replace("/compose");
    }
  }, [ideaPrefill, postId, router, scheduledAtPrefill]);

  const showSuccessCard = useCallback((state: ComposeSuccessState) => {
    clearComposeState();
    setSuccessState(state);
  }, [clearComposeState]);

  const resetToEditor = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    setSuccessState(null);
    clearComposeState();
  }, [clearComposeState]);

  function dismissIdeaBanner() {
    setShowIdeaBanner(false);

    if (!ideaPrefill) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("idea");
    const query = params.toString();
    router.replace(query ? `/compose?${query}` : "/compose");
  }

  const countLabel = useMemo(() => {
    if (platform === "linkedin") return `${content.length} / 3000`;
    return `${content.length} / 280`;
  }, [content.length, platform]);

  const selectedPlatforms = useMemo<PublishPlatform[]>(() => {
    if (platform === "both") return ["linkedin", "twitter"];
    return [platform];
  }, [platform]);
  const currentWritingMode = useMemo(
    () => writingModes.find((mode) => mode.value === writingMode) ?? writingModes[0],
    [writingMode]
  );
  const CurrentModeIcon = currentWritingMode.icon;
  const modeInputValue = writingMode === "idea" ? ideaInput : notesInput;
  const supportsFirstComment = selectedPlatforms.includes("linkedin");
  const profileStrength = voiceProfile ? getVoiceProfileStrength(voiceProfile) : null;
  const profileDimensions = voiceProfile ? getVoiceDimensions(voiceProfile) : null;
  const showVoiceProfile = Boolean(voice.traits && voice.traits.length > 0);
  const shouldHighlightWeakest =
    showVoiceProfile &&
    Boolean(content.trim()) &&
    !voice.safeToPublish &&
    Boolean(voice.weakestSentence.trim());
  const canSubmit = Boolean(content.trim()) && !loadingExistingPost && !loadPostError;
  const canRunCopilot =
    writingMode === "draft" ? canSubmit : Boolean(modeInputValue.trim()) && !loadingExistingPost && !loadPostError;
  const editorPlaceholder =
    writingMode === "idea"
      ? "Your generated draft will appear here. Tweak it, score it, and publish when it sounds right."
      : writingMode === "notes"
        ? "Quill will turn your rough notes into a cleaner draft here."
        : "Paste or write a draft here, then refine it in your voice.";
  const highlightMarkup = useMemo(
    () => buildHighlightMarkup(content, voice.weakestSentence),
    [content, voice.weakestSentence]
  );

  const openComposeWorkspace = useCallback(
    (workspace: ComposeWorkspaceMode, queueView: ScheduledWorkspaceView = "list") => {
      const params = new URLSearchParams(searchParams.toString());

      if (workspace === "compose") {
        params.delete("workspace");
        params.delete("queueView");
      } else {
        params.set("workspace", "scheduled");
        if (queueView === "calendar") {
          params.set("queueView", "calendar");
        } else {
          params.delete("queueView");
        }
      }

      const query = params.toString();
      router.replace(query ? `/compose?${query}` : "/compose");
    },
    [router, searchParams]
  );

  function renderWorkspaceHeader() {
    return (
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Compose</h1>
          <p className="mt-1 text-sm text-muted">
            Write, build carousels, and manage your publishing queue from one workspace.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openComposeWorkspace("compose")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
              activeWorkspace === "compose"
                ? "bg-brand text-white"
                : "border border-line bg-white text-muted hover:border-brand/20 hover:text-brand"
            )}
          >
            <PenSquare className="h-4 w-4" />
            Compose
          </button>

          <Link
            href="/carousel"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-muted transition hover:border-brand/20 hover:text-brand"
          >
            <LayoutTemplate className="h-4 w-4" />
            Carousel
          </Link>

          <button
            type="button"
            onClick={() => openComposeWorkspace("scheduled", scheduledWorkspaceView)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
              activeWorkspace === "scheduled"
                ? "bg-brand text-white"
                : "border border-line bg-white text-muted hover:border-brand/20 hover:text-brand"
            )}
          >
            <CalendarRange className="h-4 w-4" />
            Scheduled
          </button>
        </div>
      </div>
    );
  }

  const streamDraftIntoEditor = useCallback(
    async (
      endpoint: string,
      payload: Record<string, string>,
      fallbackMessage: string,
      transformOutput?: DraftOutputTransform
    ) => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, fallbackMessage));
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error(fallbackMessage);
      }

      const decoder = new TextDecoder();
      let output = "";
      setContent("");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
        setContent(output);
      }

      if (transformOutput) {
        setContent(transformOutput(output));
      }
    },
    [readResponseError]
  );

  const formatGeneratedDraft = useCallback(
    (value: string) => {
      if (platform === "twitter") return value;
      return formatLinkedInPostSpacing(value);
    },
    [platform]
  );

  const formatCurrentDraftSpacing = useCallback(() => {
    const formatted = formatLinkedInPostSpacing(content);
    if (!formatted) return;

    setContent(formatted);
    if (formatted === content) {
      toast.message("Spacing already looks clean.");
      return;
    }
    toast.success("Spacing formatted.");
  }, [content]);

  const rewriteInVoice = useCallback(async () => {
    if (voice.safeToPublish) {
      toast.message("Voice match already looks good. Edit manually for taste.");
      return;
    }

    setRewriteLoading(true);
    try {
      await streamDraftIntoEditor(
        "/api/voice/rewrite",
        { text: content },
        "Unable to rewrite post",
        formatGeneratedDraft
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to rewrite post");
    } finally {
      setRewriteLoading(false);
    }
  }, [content, formatGeneratedDraft, streamDraftIntoEditor, voice.safeToPublish]);

  const runCopilot = useCallback(async () => {
    if (!canRunCopilot) return;

    if (writingMode === "draft") {
      await rewriteInVoice();
      return;
    }

    setCopilotLoading(true);
    try {
      await streamDraftIntoEditor(
        "/api/voice/generate",
        {
          mode: writingMode,
          input: modeInputValue,
          platform,
        },
        "Unable to generate in your voice right now",
        formatGeneratedDraft
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to generate in your voice right now"
      );
    } finally {
      setCopilotLoading(false);
    }
  }, [
    canRunCopilot,
    formatGeneratedDraft,
    modeInputValue,
    platform,
    rewriteInVoice,
    streamDraftIntoEditor,
    writingMode,
  ]);

  const saveOrUpdatePost = useCallback(async (payload: {
    content: string;
    platforms: string[];
    firstComment?: string | null;
    scheduledAt?: string | null;
    status?: "draft" | "scheduled";
  }) => {
    const isEditing = Boolean(postId);
    const endpoint = isEditing ? `/api/posts/${postId}` : "/api/posts";
    const method = isEditing ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await readResponseError(response, "Unable to save post"));
    }
  }, [postId, readResponseError]);

  const saveDraft = useCallback(async () => {
    setSaving(true);
    try {
      await saveOrUpdatePost({
        content,
        platforms: selectedPlatforms,
        firstComment: supportsFirstComment ? firstComment.trim() || null : null,
        scheduledAt: null,
        status: "draft",
      });
      toast.success("Post saved as draft.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save draft");
    } finally {
      setSaving(false);
    }
  }, [content, firstComment, saveOrUpdatePost, selectedPlatforms, supportsFirstComment]);

  const scheduleCurrentPost = useCallback(async () => {
    setSaving(true);
    try {
      const scheduledFor = scheduledAt;
      await saveOrUpdatePost({
        content,
        platforms: selectedPlatforms,
        firstComment: supportsFirstComment ? firstComment.trim() || null : null,
        scheduledAt: scheduledFor,
        status: "scheduled",
      });
      setScheduleOpen(false);
      showSuccessCard({
        kind: "scheduled",
        scheduledAt: scheduledFor,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to schedule post");
    } finally {
      setSaving(false);
    }
  }, [content, firstComment, saveOrUpdatePost, scheduledAt, selectedPlatforms, showSuccessCard, supportsFirstComment]);

  const publishNow = useCallback(async () => {
    setPublishing(true);
    try {
      const response = await fetch("/api/publish/now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postId ?? undefined,
          content,
          platforms: selectedPlatforms,
          firstComment: supportsFirstComment ? firstComment.trim() || null : null,
        }),
      });
      if (!response.ok) {
        throw new Error(await readResponseError(response, "Unable to publish post"));
      }
      showSuccessCard({
        kind: "published",
        platforms: selectedPlatforms,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to publish post", {
        action: {
          label: "Retry",
          onClick: () => {
            void publishNow();
          },
        },
      });
    } finally {
      setPublishing(false);
    }
  }, [
    content,
    firstComment,
    postId,
    readResponseError,
    selectedPlatforms,
    showSuccessCard,
    supportsFirstComment,
  ]);

  useEffect(() => {
    const isMac = typeof navigator !== "undefined" && /(Mac|iPhone|iPad)/i.test(navigator.platform);
    const modifierKey = isMac ? "metaKey" : "ctrlKey";

    function handleKeyDown(event: KeyboardEvent) {
      const hasModifier = modifierKey === "metaKey" ? event.metaKey : event.ctrlKey;
      if (!hasModifier) {
        return;
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!saving) {
          void saveDraft();
        }
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();

        if (scheduleOpen) {
          if (!saving && scheduledAt) {
            void scheduleCurrentPost();
          }
          return;
        }

        if (!publishing) {
          void publishNow();
        }
      }
    }

    function handleEscape() {
      setScheduleOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("quill:escape", handleEscape as EventListener);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("quill:escape", handleEscape as EventListener);
    };
  }, [publishNow, publishing, saveDraft, saving, scheduleCurrentPost, scheduleOpen, scheduledAt]);

  const scheduledWorkspaceContent = (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Manage drafts, scheduled posts, published posts, and calendar timing from Compose.
        </p>

        <div className="inline-flex w-fit rounded-md border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => openComposeWorkspace("scheduled", "list")}
            className={cn(
              "inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition",
              scheduledWorkspaceView === "list" ? "bg-brand text-white" : "text-muted"
            )}
          >
            <CalendarRange className="h-4 w-4" />
            Queue
          </button>
          <button
            type="button"
            onClick={() => openComposeWorkspace("scheduled", "calendar")}
            className={cn(
              "inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition",
              scheduledWorkspaceView === "calendar" ? "bg-brand text-white" : "text-muted"
            )}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </button>
        </div>
      </div>

      {scheduledWorkspaceView === "calendar" ? <CalendarClient /> : <ScheduledClient embedded />}
    </>
  );

  const composeWorkspaceContent = successState ? (
    <div className="quill-card bg-brand-light px-6 py-12 text-center">
      <div className="mx-auto max-w-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white">
          <Check className="h-8 w-8 text-brand" />
        </div>
        <h2 className="mt-6 text-3xl font-semibold text-ink">
          {successState.kind === "published"
            ? `Published to ${formatPlatformLabel(successState.platforms)} ✓`
            : "Scheduled ✓"}
        </h2>
        <p className="mt-3 text-base text-muted">
          {successState.kind === "published"
            ? "Your post is live. Keep the momentum going."
            : `Your post will go live on ${format(new Date(successState.scheduledAt), "EEEE, MMMM d 'at' p")}.`}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={resetToEditor}>Compose next post</Button>
          <button
            type="button"
            onClick={() => openComposeWorkspace("scheduled")}
            className="inline-flex h-10 items-center justify-center rounded-md border border-brand/20 bg-white px-4 text-sm font-medium text-brand transition hover:bg-brand-light"
          >
            View in Scheduled
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] xl:items-start">
      <div className="quill-card p-4 lg:p-5">
        {loadingExistingPost ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line bg-slate-50 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
            <div>
              <p className="font-medium text-ink">Loading draft…</p>
              <p className="mt-1 text-sm text-muted">
                Pulling the latest saved version before editing.
              </p>
            </div>
          </div>
        ) : loadPostError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-6">
            <p className="font-medium text-red-700">Unable to load this draft</p>
            <p className="mt-2 text-sm text-red-600">{loadPostError}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => openComposeWorkspace("scheduled")}>
                Back to Scheduled
              </Button>
              <Button onClick={() => router.replace("/compose")}>Start fresh</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {platformTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setPlatform(tab.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      platform === tab.value
                        ? "bg-brand text-white"
                        : "border border-line bg-white text-muted hover:border-brand/20 hover:text-brand"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {profileStrength && (
                <div
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    profileStrength.state === "weak"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : profileStrength.state === "forming"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {profileStrength.label}
                </div>
              )}
            </div>

            <p className="mt-3 text-xs leading-5 text-muted">
              Format support: text posts on LinkedIn and X, plus LinkedIn first comments. Use{" "}
              <span className="font-medium text-ink">Carousel</span> for PDF/document posts.
            </p>

            {showIdeaBanner && (
              <div className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-brand/20 bg-brand-light/40 px-4 py-3 text-sm text-muted">
                <p>Idea loaded — generate a draft in your voice, then refine it below.</p>
                <button
                  type="button"
                  onClick={dismissIdeaBanner}
                  className="shrink-0 text-muted transition hover:text-brand"
                  aria-label="Dismiss idea banner"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mt-5 overflow-hidden rounded-md border border-line bg-white">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-ink">Working draft</p>
                  <p className="mt-1 text-xs text-muted">
                    {writingMode === "draft"
                      ? "Refine the draft here, then use Voice DNA as a final check."
                      : "Quill writes the first pass. You shape it here before it goes live."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Voice check
                  </span>
                  <VoiceScoreBadge
                    score={voice.score}
                    toneScore={voice.toneScore}
                    rhythmScore={voice.rhythmScore}
                    wordChoiceScore={voice.wordChoiceScore}
                    safeToPublish={voice.safeToPublish}
                    animate={animateScore}
                    variant="compact"
                  />
                </div>
              </div>

              <div className="relative">
                {shouldHighlightWeakest && (
                    <div
                      ref={highlightRef}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 overflow-auto bg-surface px-4 py-4 text-base leading-7 text-ink"
                      dangerouslySetInnerHTML={{ __html: highlightMarkup }}
                    />
                )}

                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  onScroll={syncHighlightScroll}
                  className={`quill-textarea min-h-[420px] rounded-none border-0 bg-transparent px-4 py-4 text-base leading-7 shadow-none lg:min-h-[520px] ${
                    shouldHighlightWeakest ? "relative bg-transparent text-transparent" : ""
                  }`}
                  style={
                    shouldHighlightWeakest
                        ? {
                            caretColor: "rgb(var(--color-ink))",
                            WebkitTextFillColor: "transparent",
                          }
                      : undefined
                  }
                  placeholder={editorPlaceholder}
                />
              </div>

              <div className="border-t border-line px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3 text-sm text-muted">
                  <div>
                    <p>{countLabel}</p>
                    {(platform === "twitter" || platform === "both") && (
                      <p className="mt-1 text-xs">Posts over 280 chars will be auto-threaded.</p>
                    )}
                  </div>
                  {supportsFirstComment && (
                    <button
                      type="button"
                      onClick={() => setFirstCommentOpen((current) => !current)}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      {firstCommentOpen ? "− Hide first comment" : "+ Add first comment"}
                    </button>
                  )}
                </div>

                {supportsFirstComment && firstCommentOpen && (
                  <div className="mt-4 rounded-xl border border-line bg-slate-50 p-4">
                    <label className="block text-sm font-medium text-ink">
                      First comment (optional)
                    </label>
                    <textarea
                      value={firstComment}
                      onChange={(event) => setFirstComment(event.target.value.slice(0, 1250))}
                      className="quill-textarea mt-3 min-h-[120px] bg-white"
                      placeholder="This will be posted as your first comment immediately after publishing. Great for dropping your link or adding context."
                    />
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={saveDraft}
                    disabled={saving || !canSubmit}
                    className="gap-2"
                  >
                    <span>{saving ? "Saving..." : "Save draft"}</span>
                    {!saving && <KeyboardHint keys={`${shortcutModifier}S`} />}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={formatCurrentDraftSpacing}
                    disabled={!content.trim()}
                    className="gap-2"
                  >
                    <AlignLeft className="h-4 w-4" />
                    Format spacing
                  </Button>
                  <Button
                    onClick={() => setScheduleOpen(true)}
                    disabled={!canSubmit || !AUTO_SCHEDULING_ENABLED}
                  >
                    Schedule post
                  </Button>
                  <Button
                    variant="outline"
                    onClick={publishNow}
                    disabled={publishing || !canSubmit}
                    className="gap-2"
                  >
                    <span>{publishing ? "Publishing..." : "Publish now"}</span>
                    {!publishing && <KeyboardHint keys={`${shortcutModifier}↵`} />}
                  </Button>
                </div>

                {!AUTO_SCHEDULING_ENABLED && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Scheduling is currently turned off in this environment. Publish now still works.
                  </div>
                )}

                {scheduleOpen && (
                  <div className="mt-4 rounded-xl border border-line bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label className="mb-2 block text-sm font-medium text-ink">
                          Schedule date &amp; time
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(event) => setScheduledAt(event.target.value)}
                          className="quill-input"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={scheduleCurrentPost} disabled={!scheduledAt || saving}>
                          Confirm
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
                    <CurrentModeIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                      Writing copilot
                    </p>
                    <p className="truncate text-sm font-medium text-ink">
                      {currentWritingMode.title}
                    </p>
                  </div>
                </div>

                <div className="inline-flex rounded-md border border-line bg-white p-1">
                  {writingModes.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setWritingMode(mode.value)}
                      className={cn(
                        "rounded px-3 py-1.5 text-sm font-medium transition",
                        writingMode === mode.value ? "bg-brand text-white" : "text-muted"
                      )}
                    >
                      {mode.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                {writingMode !== "draft" ? (
                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      {writingMode === "idea" ? "Idea or angle" : "Rough notes"}
                    </span>
                    <textarea
                      value={modeInputValue}
                      onChange={(event) =>
                        writingMode === "idea"
                          ? setIdeaInput(event.target.value)
                          : setNotesInput(event.target.value)
                      }
                      className="quill-textarea mt-2 min-h-[96px] bg-white"
                      placeholder={currentWritingMode.placeholder}
                    />
                  </label>
                ) : (
                  <div className="rounded-md border border-dashed border-line bg-white px-4 py-3 text-sm leading-6 text-muted">
                    Uses the draft above as the prompt and tightens structure, phrasing, and clarity.
                  </div>
                )}

                <Button
                  onClick={() => {
                    void runCopilot();
                  }}
                  disabled={copilotLoading || rewriteLoading || !canRunCopilot}
                  className="gap-2 lg:w-[180px]"
                >
                  {copilotLoading || rewriteLoading ? "Working..." : currentWritingMode.actionLabel}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {!loadingExistingPost && !loadPostError && (
        <CompactVoiceDnaRail
          voice={voice}
          profileDimensions={profileDimensions}
          profileStrength={profileStrength}
          loadingScore={loadingScore}
          rewriteLoading={rewriteLoading}
          animateScore={animateScore}
          canRefine={canSubmit}
          onRewrite={rewriteInVoice}
          onApplySuggestion={(suggestion) =>
            setContent((current) =>
              replaceWeakestSentence(current, voice.weakestSentence, suggestion)
            )
          }
        />
      )}
    </div>
  );

  return (
    <section className="space-y-6">
      {renderWorkspaceHeader()}
      {activeWorkspace === "scheduled" ? (
        scheduledWorkspaceContent
      ) : (
        composeWorkspaceContent
      )}
    </section>
  );
}
