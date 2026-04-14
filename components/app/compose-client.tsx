"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type VoiceScore = {
  score: number | null;
  feedback: string;
  tip: string;
  weakestSentence: string;
  suggestions: string[];
  traits: string[];
  summary?: string | null;
};

type PlatformMode = "linkedin" | "twitter" | "both";

const platformTabs: { label: string; value: PlatformMode }[] = [
  { label: "LinkedIn", value: "linkedin" },
  { label: "X", value: "twitter" },
  { label: "Both", value: "both" },
];

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

  return `${before}<mark class="rounded-sm bg-transparent decoration-amber-400/90 underline decoration-2 underline-offset-2">${target}</mark>${after}\n`;
}

export function ComposeClient() {
  const searchParams = useSearchParams();
  const postId = searchParams.get("postId");
  const [platform, setPlatform] = useState<PlatformMode>("both");
  const [content, setContent] = useState("");
  const [voice, setVoice] = useState<VoiceScore>({
    score: null,
    feedback: "Set up your Voice DNA first",
    tip: "",
    weakestSentence: "",
    suggestions: [],
    traits: [],
  });
  const [loadingScore, setLoadingScore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [firstCommentOpen, setFirstCommentOpen] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  async function readResponseError(response: Response, fallback: string) {
    try {
      const data = await response.json();
      return data.error ?? fallback;
    } catch {
      return fallback;
    }
  }

  useEffect(() => {
    if (!postId) return;

    fetch("/api/posts")
      .then((response) => response.json())
      .then((data) => {
        const post = (data.posts ?? []).find((item: { id: string }) => item.id === postId);
        if (!post) return;
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
      })
      .catch(() => undefined);
  }, [postId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!content.trim()) {
      setVoice({
        score: null,
        feedback: "Start writing to score your post.",
        tip: "",
        weakestSentence: "",
        suggestions: [],
        traits: [],
      });
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
        const result = await response.json();
        setVoice(result);
      } catch {
        setVoice({
          score: null,
          feedback: "Unable to score this draft right now.",
          tip: "",
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

  function syncHighlightScroll() {
    if (!textareaRef.current || !highlightRef.current) return;
    highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
  }

  const countLabel = useMemo(() => {
    if (platform === "linkedin") return `${content.length} / 3000`;
    return `${content.length} / 280`;
  }, [content.length, platform]);

  const selectedPlatforms = useMemo(() => {
    if (platform === "both") return ["linkedin", "twitter"];
    return [platform];
  }, [platform]);
  const supportsFirstComment = selectedPlatforms.includes("linkedin");

  const showVoiceProfile = Boolean(voice.traits && voice.traits.length > 0);
  const shouldHighlightWeakest =
    showVoiceProfile && Boolean(content.trim()) && Boolean(voice.weakestSentence.trim());
  const highlightMarkup = useMemo(
    () => buildHighlightMarkup(content, voice.weakestSentence),
    [content, voice.weakestSentence]
  );

  async function saveOrUpdatePost(payload: {
    content: string;
    platforms: string[];
    firstComment?: string | null;
    scheduledAt?: string | null;
    status?: "draft" | "scheduled";
  }) {
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
  }

  async function saveDraft() {
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
  }

  async function scheduleCurrentPost() {
    setSaving(true);
    try {
      await saveOrUpdatePost({
        content,
        platforms: selectedPlatforms,
        firstComment: supportsFirstComment ? firstComment.trim() || null : null,
        scheduledAt,
        status: "scheduled",
      });
      setScheduleOpen(false);
      toast.success(`Post scheduled for ${format(new Date(scheduledAt), "PPP p")}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to schedule post");
    } finally {
      setSaving(false);
    }
  }

  async function publishNow() {
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
      toast.success(
        supportsFirstComment && Boolean(firstComment.trim())
          ? "Post published and first comment added ✓"
          : "Post published."
      );
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
  }

  async function rewriteInVoice() {
    setRewriteLoading(true);
    try {
      const response = await fetch("/api/voice/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, "Unable to rewrite post"));
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let output = "";

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
        setContent(output);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to rewrite post");
    } finally {
      setRewriteLoading(false);
    }
  }

  const score = voice.score ?? 0;
  const ringOffset = 339 - (339 * score) / 100;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Compose</h1>
        <p className="mt-1 text-sm text-muted">
          Draft once, score against your voice, then publish or schedule.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="quill-card p-6">
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

          <div className="relative mt-5">
            {shouldHighlightWeakest && (
              <div
                ref={highlightRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-auto rounded-md border border-line bg-white px-3 py-3 text-sm leading-6 text-ink"
                dangerouslySetInnerHTML={{ __html: highlightMarkup }}
              />
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onScroll={syncHighlightScroll}
              className={`quill-textarea min-h-[320px] ${
                shouldHighlightWeakest ? "relative bg-transparent text-transparent" : ""
              }`}
              style={
                shouldHighlightWeakest
                  ? {
                      caretColor: "#1A1A1A",
                      WebkitTextFillColor: "transparent",
                    }
                  : undefined
              }
              placeholder="Write your post here..."
            />
          </div>

          <div className="mt-3 text-sm text-muted">{countLabel}</div>
          {(platform === "twitter" || platform === "both") && (
            <div className="mt-1 text-xs text-muted">
              Posts over 280 chars will be auto-threaded.
            </div>
          )}
          {supportsFirstComment && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setFirstCommentOpen((current) => !current)}
                className="text-sm font-medium text-brand hover:underline"
              >
                {firstCommentOpen ? "− Hide first comment" : "+ Add first comment"}
              </button>
            </div>
          )}

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

          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="outline" onClick={saveDraft} disabled={saving}>
              {saving ? "Saving..." : "Save draft"}
            </Button>
            <Button onClick={() => setScheduleOpen(true)}>Schedule post</Button>
            <Button variant="outline" onClick={publishNow} disabled={publishing}>
              {publishing ? "Publishing..." : "Publish now"}
            </Button>
          </div>

          {scheduleOpen && (
            <div className="mt-5 rounded-xl border border-line bg-slate-50 p-4">
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

        <div className="quill-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Voice DNA Score</h2>
              <p className="mt-1 text-sm text-muted">
                {loadingScore ? "Scoring..." : "How closely this draft matches your voice."}
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" stroke="#E5E7EB" strokeWidth="10" fill="none" />
              <circle
                cx="60"
                cy="60"
                r="54"
                stroke="#534AB7"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                strokeDasharray="339"
                strokeDashoffset={ringOffset}
              />
              <text
                x="60"
                y="66"
                textAnchor="middle"
                className="rotate-90 fill-[#1A1A1A] text-[22px] font-semibold"
                transform="rotate(90 60 60)"
              >
                {voice.score ?? "--"}
              </text>
            </svg>
          </div>

          {showVoiceProfile ? (
            <>
              <div className="mt-6 flex flex-wrap gap-2">
                {voice.traits.slice(0, 3).map((trait) => (
                  <span
                    key={trait}
                    className="rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand"
                  >
                    {trait}
                  </span>
                ))}
              </div>

              <p className="mt-4 text-sm leading-6 text-muted">{voice.feedback}</p>
              {voice.tip && <p className="mt-2 text-sm leading-6 text-muted">{voice.tip}</p>}

              {voice.suggestions.length > 0 && (
                <ol className="mt-5 space-y-3">
                  {voice.suggestions.map((suggestion, index) => (
                    <li
                      key={`${index}-${suggestion}`}
                      className="flex items-start justify-between gap-3 rounded-lg border border-line px-3 py-3"
                    >
                      <div className="flex gap-3 text-sm leading-6 text-muted">
                        <span className="font-medium text-ink">{index + 1}.</span>
                        <span>{suggestion}</span>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 px-3 py-1 text-xs"
                        onClick={() =>
                          setContent((current) =>
                            replaceWeakestSentence(current, voice.weakestSentence, suggestion)
                          )
                        }
                      >
                        Apply
                      </Button>
                    </li>
                  ))}
                </ol>
              )}

              <Button
                variant="outline"
                className="mt-5 w-full"
                onClick={rewriteInVoice}
                disabled={rewriteLoading}
              >
                {rewriteLoading ? "Rewriting..." : "Rewrite in my voice →"}
              </Button>
            </>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-brand/30 bg-brand-light/40 p-4 text-sm leading-6 text-muted">
              Set up Voice DNA to unlock scoring.{" "}
              <Link href="/voice-dna" className="font-medium text-brand hover:underline">
                Go to Voice DNA
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
