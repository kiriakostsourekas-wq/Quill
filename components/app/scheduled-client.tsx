"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/app/platform-badge";
import {
  AUTO_SCHEDULING_ENABLED,
  AUTO_SCHEDULING_UNAVAILABLE_MESSAGE,
} from "@/lib/scheduling";
import { StatusBadge } from "@/components/app/status-badge";
import { VoiceScoreBadge } from "@/components/app/voice-score-badge";

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
};

const filters = ["all", "scheduled", "draft", "published", "failed"] as const;

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

  return (
    <section className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold text-ink">Scheduled</h1>
          <p className="mt-1 text-sm text-muted">
            Manage text-post scheduling, drafts, published posts, and failed posts. LinkedIn
            carousels stay draft-or-publish-now only.
          </p>
        </div>
      )}

      {!AUTO_SCHEDULING_ENABLED && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {AUTO_SCHEDULING_UNAVAILABLE_MESSAGE} Existing scheduled posts will stay queued until scheduling is enabled.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
              activeFilter === filter
                ? "bg-brand text-white"
                : "border border-line bg-white text-muted"
            }`}
          >
            {filter === "draft" ? "Drafts" : filter}
          </button>
        ))}
      </div>

      <div className="quill-card divide-y divide-line overflow-hidden">
        {visiblePosts.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-brand">
              <Pencil className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-ink">No posts yet.</h2>
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

            return (
              <div key={post.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  {isCarousel ? (
                    <div>
                      <div className="inline-flex rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand">
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
                    <p className="line-clamp-2 text-sm leading-6 text-ink">{post.content}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
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
                  </div>

                  {showDeliveryDetails && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50/60 p-3">
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

                      <div className="mt-3 space-y-2">
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

                <div className="text-sm text-muted lg:w-48">
                  {post.scheduledAt
                    ? new Date(post.scheduledAt).toLocaleString()
                    : new Date(post.createdAt).toLocaleDateString()}
                </div>

                <div className="flex items-center gap-2">
                  {canRetry && !isCarousel ? (
                    <Button variant="outline" className="gap-2" onClick={() => retryPost(post)}>
                      <RotateCcw className="h-4 w-4" />
                      Retry failed platforms
                    </Button>
                  ) : canEdit ? (
                    <Link href={`${isCarousel ? "/carousel" : "/compose"}?postId=${post.id}`}>
                      <Button variant="outline" className="gap-2">
                        <Pencil className="h-4 w-4" />
                        {isCarousel ? "Open carousel" : "Edit"}
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" className="gap-2" disabled>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    className="gap-2"
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
    </section>
  );
}
