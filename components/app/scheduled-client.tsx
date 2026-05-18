"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/app/platform-badge";
import { AUTO_SCHEDULING_UNAVAILABLE_MESSAGE } from "@/lib/scheduling";
import { StatusBadge } from "@/components/app/status-badge";
import { VoiceScoreBadge } from "@/components/app/voice-score-badge";
import { cn } from "@/lib/utils";

type DeliveryRecord = {
  platform: string;
  status: string;
  publishedAt?: string | null;
  errorLog?: string | null;
  attemptCount?: number | null;
  lastAttemptAt?: string | null;
};

type PublishAttemptRecord = {
  id: string;
  platform: string;
  trigger: string;
  status: string;
  errorLog?: string | null;
  createdAt: string;
  completedAt?: string | null;
};

type PerformanceOutcome = "underperformed" | "expected" | "outperformed";

type PerformanceFeedbackRecord = {
  id: string;
  outcome: PerformanceOutcome;
  likes?: number | null;
  comments?: number | null;
  reposts?: number | null;
  impressions?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type PostRecord = {
  id: string;
  postType?: string;
  content: string;
  firstComment?: string | null;
  carouselSlides?: Array<{ headline: string; body: string }> | null;
  coverSlide?: boolean;
  platforms: string[];
  status: string;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  errorLog?: string | null;
  voiceScore?: number | null;
  voiceToneScore?: number | null;
  voiceRhythmScore?: number | null;
  voiceWordChoiceScore?: number | null;
  voiceSafeToPublish?: boolean | null;
  deliveries?: DeliveryRecord[];
  publishAttempts?: PublishAttemptRecord[];
  performanceFeedback?: PerformanceFeedbackRecord | null;
};

const filters = ["all", "scheduled", "draft", "published", "failed"] as const;
const showSchedulingDisabledWarning =
  process.env.NEXT_PUBLIC_AUTO_SCHEDULING_ENABLED === "false";
const performanceOutcomeOptions: Array<{ value: PerformanceOutcome; label: string }> = [
  { value: "underperformed", label: "Underperformed" },
  { value: "expected", label: "Expected" },
  { value: "outperformed", label: "Outperformed" },
];
const performanceMetricFields = [
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "reposts", label: "Reposts" },
  { key: "impressions", label: "Impressions" },
] as const;
const emptyFeedbackForm = {
  outcome: "expected" as PerformanceOutcome,
  likes: "",
  comments: "",
  reposts: "",
  impressions: "",
  notes: "",
};

function getFilterLabel(filter: (typeof filters)[number]) {
  return filter === "draft" ? "Drafts" : filter;
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDeliveryRows(post: PostRecord): DeliveryRecord[] {
  const deliveriesByPlatform = new Map(
    (post.deliveries ?? []).map((delivery) => [delivery.platform, delivery])
  );

  return post.platforms.map(
    (platform) =>
      deliveriesByPlatform.get(platform) ?? {
        platform,
        status: "pending",
        errorLog: null,
        attemptCount: 0,
        lastAttemptAt: null,
        publishedAt: null,
      }
  );
}

function getLatestAttempt(post: PostRecord, platform: string) {
  return post.publishAttempts?.find((attempt) => attempt.platform === platform);
}

function isDeliveryUnpublished(delivery: DeliveryRecord) {
  return delivery.status !== "published";
}

function shouldShowDeliveryDetails(post: PostRecord, deliveries: DeliveryRecord[]) {
  const hasPublishedDelivery = deliveries.some((delivery) => delivery.status === "published");
  const hasUnpublishedDelivery = deliveries.some(isDeliveryUnpublished);

  return (
    post.status === "failed" ||
    deliveries.some((delivery) => delivery.status === "failed" || Boolean(delivery.errorLog)) ||
    (hasPublishedDelivery && hasUnpublishedDelivery)
  );
}

function getDeliveryLabel(post: PostRecord, delivery: DeliveryRecord) {
  if (delivery.status === "published") return "Published";
  if (delivery.status === "publishing") return "Publishing";
  if (delivery.status === "failed") return "Failed";
  if (post.status === "failed" && delivery.status === "pending") return "Not published";
  return "Pending";
}

function getDeliveryTone(delivery: DeliveryRecord) {
  if (delivery.status === "published") {
    return {
      container: "border-emerald-200 bg-emerald-50/80",
      label: "bg-emerald-100 text-emerald-700",
      text: "text-emerald-700",
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    };
  }

  if (delivery.status === "publishing") {
    return {
      container: "border-amber-200 bg-amber-50/80",
      label: "bg-amber-100 text-amber-700",
      text: "text-amber-700",
      icon: <Clock className="h-4 w-4 text-amber-600" />,
    };
  }

  return {
    container: "border-red-200 bg-red-50/80",
    label: "bg-red-100 text-red-700",
    text: "text-red-700",
    icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
  };
}

function getPerformanceOutcomeLabel(outcome?: string | null) {
  return (
    performanceOutcomeOptions.find((option) => option.value === outcome)?.label ??
    "Performance logged"
  );
}

function formatMetricInput(value?: number | null) {
  return value == null ? "" : String(value);
}

function getInitialFeedbackForm(post: PostRecord) {
  const feedback = post.performanceFeedback;
  if (!feedback) return emptyFeedbackForm;

  return {
    outcome: feedback.outcome,
    likes: formatMetricInput(feedback.likes),
    comments: formatMetricInput(feedback.comments),
    reposts: formatMetricInput(feedback.reposts),
    impressions: formatMetricInput(feedback.impressions),
    notes: feedback.notes ?? "",
  };
}

function parseOptionalMetric(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Metrics must be whole numbers.");
  }

  return parsed;
}

async function fetchPosts() {
  const response = await fetch("/api/posts?view=publish-status");
  if (!response.ok) {
    let message = "Unable to load posts";
    try {
      const data = await response.json();
      message = data.error ?? message;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  return data.posts ?? [];
}

export function ScheduledClient({ embedded = false }: { embedded?: boolean }) {
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("all");
  const [feedbackPost, setFeedbackPost] = useState<PostRecord | null>(null);
  const [feedbackForm, setFeedbackForm] = useState(emptyFeedbackForm);
  const [savingFeedback, setSavingFeedback] = useState(false);

  async function readResponseError(response: Response, fallback: string) {
    try {
      const data = await response.json();
      return data.error ?? fallback;
    } catch {
      return fallback;
    }
  }

  async function loadPosts() {
    setPosts(await fetchPosts());
  }

  useEffect(() => {
    loadPosts().catch((error) => {
      setPosts([]);
      toast.error(error instanceof Error ? error.message : "Unable to load posts");
    });
  }, []);

  const visiblePosts = useMemo(() => {
    if (activeFilter === "all") return posts;
    if (activeFilter === "scheduled") {
      return posts.filter((post) => ["scheduled", "publishing"].includes(post.status));
    }
    return posts.filter((post) => post.status === activeFilter);
  }, [activeFilter, posts]);

  const filterCounts = useMemo(
    () => ({
      all: posts.length,
      scheduled: posts.filter((post) => ["scheduled", "publishing"].includes(post.status)).length,
      draft: posts.filter((post) => post.status === "draft").length,
      published: posts.filter((post) => post.status === "published").length,
      failed: posts.filter((post) => post.status === "failed").length,
    }),
    [posts]
  );

  async function deletePost(id: string) {
    if (!window.confirm("Delete this post?")) return;
    const response = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error(await readResponseError(response, "Unable to delete post"));
      return;
    }
    await loadPosts();
    toast.success("Post deleted.");
  }

  async function retryPost(post: PostRecord) {
    const response = await fetch("/api/publish/now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: post.id,
        content: post.content,
        platforms: post.platforms,
        firstComment: post.firstComment ?? null,
      }),
    });
    if (!response.ok) {
      toast.error(await readResponseError(response, "Unable to retry publishing"));
      return;
    }
    await loadPosts();
    toast.success("Publish retry started.");
  }

  function openPerformanceFeedback(post: PostRecord) {
    setFeedbackPost(post);
    setFeedbackForm(getInitialFeedbackForm(post));
  }

  async function savePerformanceFeedback() {
    if (!feedbackPost) return;

    setSavingFeedback(true);
    try {
      const payload = {
        postId: feedbackPost.id,
        outcome: feedbackForm.outcome,
        likes: parseOptionalMetric(feedbackForm.likes),
        comments: parseOptionalMetric(feedbackForm.comments),
        reposts: parseOptionalMetric(feedbackForm.reposts),
        impressions: parseOptionalMetric(feedbackForm.impressions),
        notes: feedbackForm.notes.trim() || null,
      };
      const response = await fetch("/api/performance-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save performance feedback");
      }

      setPosts((current) =>
        current.map((post) =>
          post.id === feedbackPost.id ? { ...post, performanceFeedback: data.feedback } : post
        )
      );
      setFeedbackPost(null);
      toast.success("Performance feedback saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save performance feedback");
    } finally {
      setSavingFeedback(false);
    }
  }

  return (
    <section className="space-y-4">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold text-ink">Scheduled</h1>
          <p className="mt-1 text-sm text-muted">
            Manage text-post scheduling, drafts, published posts, and failed posts. LinkedIn
            carousels stay draft-or-publish-now only.
          </p>
        </div>
      )}

      {showSchedulingDisabledWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {AUTO_SCHEDULING_UNAVAILABLE_MESSAGE} Existing scheduled posts will stay queued until scheduling is enabled.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition",
                activeFilter === filter ? "bg-brand text-white" : "text-muted hover:text-brand"
              )}
            >
              <span>{getFilterLabel(filter)}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  activeFilter === filter ? "bg-white/20 text-white" : "bg-white text-muted"
                )}
              >
                {filterCounts[filter]}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Showing {visiblePosts.length} of {posts.length}
        </p>
      </div>

        <div className="quill-card divide-y divide-line overflow-hidden">
          {visiblePosts.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
              <Pencil className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-ink">No posts yet.</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Start building your queue and Quill will keep everything organized here.
            </p>
            <Link href="/compose" className="mt-6">
              <Button>Compose your first post →</Button>
            </Link>
          </div>
        ) : (
          visiblePosts.map((post) => {
            const isCarousel = post.postType === "carousel";
            const deliveryRows = getDeliveryRows(post);
            const hasPublishedDelivery = deliveryRows.some(
              (delivery) => delivery.status === "published"
            );
            const hasRemainingUnpublished = deliveryRows.some(isDeliveryUnpublished);
            const showDeliveryDetails = shouldShowDeliveryDetails(post, deliveryRows);
            const canRetry = post.status === "failed" && hasRemainingUnpublished;
            const canEdit =
              post.status !== "publishing" && !hasPublishedDelivery && (!canRetry || isCarousel);
            const canDelete = post.status !== "publishing" && !hasPublishedDelivery;
            const canLogPerformance = post.status === "published" || hasPublishedDelivery;

            return (
              <div
                key={post.id}
                className={cn(
                  "grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_150px_auto] lg:items-start",
                  post.status === "failed" && "bg-red-50/30"
                )}
              >
                <div className="min-w-0 flex-1">
                  {isCarousel ? (
                    <div>
                      <div className="inline-flex rounded-full bg-brand-light px-2.5 py-1 text-xs font-medium text-brand">
                        Carousel
                      </div>
                      {post.status === "scheduled" && (
                        <p className="mt-2 text-xs text-amber-700">
                          Automatic scheduling is not available for carousels. Open this draft from
                          the Carousel page and publish it directly.
                        </p>
                      )}
                      {post.status === "failed" && (
                        <p className="mt-2 text-xs text-muted">
                          Review this carousel in the editor before publishing it again.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="line-clamp-2 text-sm leading-5 text-ink">{post.content}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {post.platforms.map((platform) => (
                      <PlatformBadge key={`${post.id}-${platform}`} platform={platform} />
                    ))}
                    <StatusBadge value={post.status} />
                      <VoiceScoreBadge
                        score={post.voiceScore}
                        toneScore={post.voiceToneScore}
                        rhythmScore={post.voiceRhythmScore}
                        wordChoiceScore={post.voiceWordChoiceScore}
                        safeToPublish={post.voiceSafeToPublish}
                        variant="compact"
                      />
                      {post.performanceFeedback && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-muted">
                          {getPerformanceOutcomeLabel(post.performanceFeedback.outcome)}
                        </span>
                      )}
                    </div>

                  {showDeliveryDetails && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50/70 p-3">
                      <div className="flex gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                        <div>
                          <p className="text-sm font-semibold text-red-800">
                            {hasPublishedDelivery ? "Partially published" : "Publish failed"}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-red-700">
                            {canRetry && !isCarousel
                              ? "Resolve the platform issue, then retry the unpublished platforms."
                              : "Review the platform issue before publishing again."}
                          </p>
                          {post.errorLog && (
                            <p className="mt-1 text-xs leading-5 text-red-700">
                              {post.errorLog}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        {deliveryRows.map((delivery) => {
                          const latestAttempt = getLatestAttempt(post, delivery.platform);
                          const tone = getDeliveryTone(delivery);
                          const lastAttemptAt = formatDateTime(
                            delivery.lastAttemptAt ??
                              latestAttempt?.completedAt ??
                              latestAttempt?.createdAt
                          );
                          const publishedAt = formatDateTime(delivery.publishedAt);
                          const errorMessage = delivery.errorLog ?? latestAttempt?.errorLog;
                          const recentAttempts = (post.publishAttempts ?? [])
                            .filter((attempt) => attempt.platform === delivery.platform)
                            .slice(0, 2);

                          return (
                            <div
                              key={`${post.id}-delivery-${delivery.platform}`}
                              className={`rounded-md border px-3 py-2 ${tone.container}`}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                {tone.icon}
                                <PlatformBadge platform={delivery.platform} />
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.label}`}>
                                  {getDeliveryLabel(post, delivery)}
                                </span>
                                {(delivery.attemptCount ?? 0) > 0 && (
                                  <span className="text-xs text-muted">
                                    {delivery.attemptCount}{" "}
                                    {delivery.attemptCount === 1 ? "attempt" : "attempts"}
                                  </span>
                                )}
                                {delivery.status === "published" && publishedAt && (
                                  <span className={`text-xs ${tone.text}`}>Published {publishedAt}</span>
                                )}
                                {delivery.status !== "published" && lastAttemptAt && (
                                  <span className={`text-xs ${tone.text}`}>Last tried {lastAttemptAt}</span>
                                )}
                              </div>

                              {errorMessage ? (
                                <p className="mt-2 break-words text-xs leading-5 text-red-800">
                                  {errorMessage}
                                </p>
                              ) : (
                                delivery.status !== "published" && (
                                  <p className="mt-2 text-xs leading-5 text-red-800">
                                    This platform did not publish in the latest run.
                                  </p>
                                )
                              )}

                              {recentAttempts.length > 0 && delivery.status !== "published" && (
                                <div className="mt-2 space-y-1 border-t border-red-100 pt-2">
                                  {recentAttempts.map((attempt) => {
                                    const attemptAt = formatDateTime(
                                      attempt.completedAt ?? attempt.createdAt
                                    );

                                    return (
                                      <p
                                        key={attempt.id}
                                        className="break-words text-[11px] leading-4 text-red-700"
                                      >
                                        {attempt.trigger} attempt {attempt.status}
                                        {attemptAt ? ` at ${attemptAt}` : ""}
                                        {attempt.errorLog ? `: ${attempt.errorLog}` : ""}
                                      </p>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-xs leading-5 text-muted lg:text-right">
                  {formatDateTime(post.scheduledAt ?? post.publishedAt ?? post.createdAt) ??
                    "No date"}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {canRetry && !isCarousel ? (
                    <Button
                      variant="outline"
                      className="h-8 gap-2 px-3 text-xs"
                      onClick={() => retryPost(post)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Retry failed
                    </Button>
                  ) : canEdit ? (
                    <Link href={`${isCarousel ? "/carousel" : "/compose"}?postId=${post.id}`}>
                      <Button variant="outline" className="h-8 gap-2 px-3 text-xs">
                        <Pencil className="h-4 w-4" />
                        {isCarousel ? "Open carousel" : "Edit"}
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" className="h-8 gap-2 px-3 text-xs" disabled>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                  {canLogPerformance && (
                    <Button
                      variant="outline"
                      className="h-8 gap-2 px-3 text-xs"
                      onClick={() => openPerformanceFeedback(post)}
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      {post.performanceFeedback ? "Update performance" : "Log performance"}
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    className="h-8 gap-2 px-3 text-xs"
                    onClick={() => deletePost(post.id)}
                    disabled={!canDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            );
            })
          )}
        </div>

        {feedbackPost && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/30 px-4 py-8 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="performance-feedback-title"
          >
            <button
              type="button"
              className="absolute inset-0"
              onClick={() => setFeedbackPost(null)}
              aria-label="Close performance feedback"
            />
            <div className="relative mx-auto mt-8 max-w-lg rounded-xl border border-line bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                    Published post
                  </p>
                  <h2 id="performance-feedback-title" className="mt-1 text-lg font-semibold text-ink">
                    Log performance
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedbackPost(null)}
                  className="rounded-full border border-line p-2 text-muted hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 line-clamp-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-muted">
                {feedbackPost.postType === "carousel"
                  ? "LinkedIn carousel"
                  : feedbackPost.content}
              </p>

              <div className="mt-5">
                <label className="text-sm font-medium text-ink">Outcome</label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {performanceOutcomeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFeedbackForm((current) => ({
                          ...current,
                          outcome: option.value,
                        }))
                      }
                      className={cn(
                        "rounded-full border px-3 py-2 text-sm font-medium transition",
                        feedbackForm.outcome === option.value
                          ? "border-brand bg-brand text-white"
                          : "border-line bg-white text-muted hover:border-brand/30 hover:text-brand"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {performanceMetricFields.map(({ key, label }) => (
                  <label key={key} className="text-sm font-medium text-ink">
                    {label}
                    <input
                      type="number"
                      min={0}
                      value={feedbackForm[key]}
                      onChange={(event) =>
                        setFeedbackForm((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      className="quill-input mt-2"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-5">
                <label className="text-sm font-medium text-ink">Notes</label>
                <textarea
                  value={feedbackForm.notes}
                  onChange={(event) =>
                    setFeedbackForm((current) => ({
                      ...current,
                      notes: event.target.value.slice(0, 1000),
                    }))
                  }
                  className="quill-textarea mt-2 min-h-[96px]"
                  placeholder="What seemed to work or miss?"
                />
                <p className="mt-2 text-right text-xs text-muted">
                  {feedbackForm.notes.length} / 1000
                </p>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-line pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFeedbackPost(null)}
                  disabled={savingFeedback}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={savePerformanceFeedback} disabled={savingFeedback}>
                  {savingFeedback ? "Saving..." : "Save feedback"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }
