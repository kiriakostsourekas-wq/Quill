"use client";

import Link from "next/link";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/app/platform-badge";
import { StatusBadge } from "@/components/app/status-badge";

type DeliveryRecord = {
  platform: string;
  status: string;
  publishedAt?: string | null;
  errorLog?: string | null;
};

type PostRecord = {
  id: string;
  content: string;
  platforms: string[];
  status: string;
  scheduledAt?: string | null;
  createdAt: string;
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

export function ScheduledClient() {
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

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
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to load posts",
      });
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
    setFeedback(null);
    const response = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setFeedback({
        type: "error",
        message: await readResponseError(response, "Unable to delete post"),
      });
      return;
    }
    await loadPosts();
    setFeedback({ type: "success", message: "Post deleted." });
  }

  async function retryPost(post: PostRecord) {
    setFeedback(null);
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
      setFeedback({
        type: "error",
        message: await readResponseError(response, "Unable to retry publishing"),
      });
      return;
    }
    await loadPosts();
    setFeedback({ type: "success", message: "Retry started." });
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Scheduled</h1>
        <p className="mt-1 text-sm text-muted">
          Manage upcoming, draft, published, and failed posts.
        </p>
      </div>

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

      {feedback && (
        <p className={`text-sm ${feedback.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
          {feedback.message}
        </p>
      )}

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
              <Button>Start composing →</Button>
            </Link>
          </div>
        ) : (
          visiblePosts.map((post) => {
            const hasPublishedDelivery =
              post.deliveries?.some((delivery) => delivery.status === "published") ?? false;
            const hasRemainingUnpublished =
              post.deliveries?.some((delivery) => delivery.status !== "published") ?? false;
            const canRetry = post.status === "failed" && hasRemainingUnpublished;
            const canEdit = post.status !== "publishing" && !hasPublishedDelivery && !canRetry;
            const canDelete = post.status !== "publishing" && !hasPublishedDelivery;

            return (
              <div key={post.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm leading-6 text-ink">{post.content}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {post.platforms.map((platform) => (
                      <PlatformBadge key={`${post.id}-${platform}`} platform={platform} />
                    ))}
                    <StatusBadge value={post.status} />
                  </div>
                </div>

                <div className="text-sm text-muted lg:w-48">
                  {post.scheduledAt
                    ? new Date(post.scheduledAt).toLocaleString()
                    : new Date(post.createdAt).toLocaleDateString()}
                </div>

                <div className="flex items-center gap-2">
                  {canRetry ? (
                    <Button variant="outline" className="gap-2" onClick={() => retryPost(post)}>
                      <RotateCcw className="h-4 w-4" />
                      Retry publish
                    </Button>
                  ) : canEdit ? (
                    <Link href={`/compose?postId=${post.id}`}>
                      <Button variant="outline" className="gap-2">
                        <Pencil className="h-4 w-4" />
                        Edit
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
