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
  traits?: string[];
  summary?: string | null;
};

type PlatformMode = "linkedin" | "twitter" | "both";

const platformTabs: { label: string; value: PlatformMode }[] = [
  { label: "LinkedIn", value: "linkedin" },
  { label: "X", value: "twitter" },
  { label: "Both", value: "both" },
];

export function ComposeClient() {
  const searchParams = useSearchParams();
  const postId = searchParams.get("postId");
  const [platform, setPlatform] = useState<PlatformMode>("both");
  const [content, setContent] = useState("");
  const [voice, setVoice] = useState<VoiceScore>({
    score: null,
    feedback: "Set up your Voice DNA first",
    traits: [],
  });
  const [loadingScore, setLoadingScore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
      setVoice({ score: null, feedback: "Start writing to score your post.", traits: [] });
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
        setVoice({ score: null, feedback: "Unable to score this draft right now.", traits: [] });
      } finally {
        setLoadingScore(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content]);

  const countLabel = useMemo(() => {
    if (platform === "linkedin") return `${content.length} / 3000`;
    if (platform === "twitter") return `${content.length} / 280`;
    return `${content.length} / 3000 LinkedIn • 280 X`;
  }, [content.length, platform]);

  const selectedPlatforms = useMemo(() => {
    if (platform === "both") return ["linkedin", "twitter"];
    return [platform];
  }, [platform]);

  async function saveOrUpdatePost(payload: {
    content: string;
    platforms: string[];
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
        body: JSON.stringify({ postId: postId ?? undefined, content, platforms: selectedPlatforms }),
      });
      if (!response.ok) {
        throw new Error(await readResponseError(response, "Unable to publish post"));
      }
      toast.success("Post published.");
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

          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="quill-textarea mt-5 min-h-[320px]"
            placeholder="Write your post here..."
          />

          <div className="mt-3 text-sm text-muted">{countLabel}</div>

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

          {voice.traits && voice.traits.length > 0 ? (
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
