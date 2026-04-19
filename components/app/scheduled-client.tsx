"use client";

import Link from "next/link";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
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
  createdAt: string;
  voiceScore?: number | null;
  voiceToneScore?: number | null;
  voiceRhythmScore?: number | null;
  voiceWordChoiceScore?: number | null;
  voiceSafeToPublish?: boolean | null;
  deliveries?: DeliveryRecord[];
};

const filters = ["all", "scheduled", "draft", "published", "failed"] as const;

async function fetchPosts() {
  const response = await fetch("/api/posts");
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
            const hasPublishedDelivery =
              post.deliveries?.some((delivery) => delivery.status === "published") ?? false;
            const hasRemainingUnpublished =
              post.deliveries?.some((delivery) => delivery.status !== "published") ?? false;
            const canRetry = post.status === "failed" && hasRemainingUnpublished;
            const canEdit =
              post.status !== "publishing" && !hasPublishedDelivery && (!canRetry || isCarousel);
            const canDelete = post.status !== "publishing" && !hasPublishedDelivery;

            return (
              <div key={post.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center">
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
                      Retry publish
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
