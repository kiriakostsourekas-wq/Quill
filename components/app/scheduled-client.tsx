"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/app/platform-badge";
import { StatusBadge } from "@/components/app/status-badge";

type PostRecord = {
  id: string;
  content: string;
  platforms: string[];
  status: string;
  scheduledAt?: string | null;
  createdAt: string;
};

const filters = ["all", "scheduled", "draft", "published", "failed"] as const;

export function ScheduledClient() {
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("all");

  async function loadPosts() {
    const response = await fetch("/api/posts");
    const data = await response.json();
    setPosts(data.posts ?? []);
  }

  useEffect(() => {
    loadPosts().catch(() => setPosts([]));
  }, []);

  const visiblePosts = useMemo(() => {
    if (activeFilter === "all") return posts;
    return posts.filter((post) => post.status === activeFilter);
  }, [activeFilter, posts]);

  async function deletePost(id: string) {
    if (!window.confirm("Delete this post?")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    await loadPosts();
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
          visiblePosts.map((post) => (
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
                <Link href={`/compose?postId=${post.id}`}>
                  <Button variant="outline" className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </Link>
                <Button variant="danger" className="gap-2" onClick={() => deletePost(post.id)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
