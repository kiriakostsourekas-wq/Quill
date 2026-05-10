"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/app/platform-badge";
import { StatusBadge } from "@/components/app/status-badge";
import { VoiceScoreBadge } from "@/components/app/voice-score-badge";

type PostRecord = {
  id: string;
  content: string;
  platforms: string[];
  status: string;
  createdAt: string;
  errorLog?: string | null;
  voiceScore?: number | null;
  voiceToneScore?: number | null;
  voiceRhythmScore?: number | null;
  voiceWordChoiceScore?: number | null;
  voiceSafeToPublish?: boolean | null;
  deliveries?: Array<{
    platform: string;
    status: string;
    errorLog?: string | null;
    attemptCount?: number | null;
    lastAttemptAt?: string | null;
  }>;
};

function getPlatformLabel(platform: string) {
  if (platform === "twitter" || platform === "x") return "X";
  if (platform === "linkedin") return "LinkedIn";
  return platform;
}

function getFailureSummary(post: PostRecord) {
  const failedDeliveries =
    post.deliveries?.filter(
      (delivery) =>
        delivery.status === "failed" ||
        Boolean(delivery.errorLog) ||
        (post.status === "failed" && delivery.status !== "published")
    ) ?? [];

  if (failedDeliveries.length > 0) {
    return `${failedDeliveries.map((delivery) => getPlatformLabel(delivery.platform)).join(", ")} failed`;
  }

  if (post.status === "failed") {
    return post.errorLog ?? "Publishing incomplete";
  }

  return null;
}

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/posts?view=delivery-status")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load dashboard data");
        }
        return data;
      })
      .then((data) => {
        setPosts(data.posts ?? []);
        setLoadError(null);
      })
      .catch((error) => {
        setPosts([]);
        setLoadError(error instanceof Error ? error.message : "Unable to load dashboard data");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchParams.get("welcome") !== "onboarding") return;

    toast.success("Welcome to Quill. Set up your voice first, then head to Compose to generate in your voice.");
    router.replace("/dashboard");
  }, [router, searchParams]);

  const metrics = useMemo(
    () => ({
      published: posts.filter((post) => post.status === "published").length,
      scheduled: posts.filter((post) => ["scheduled", "publishing"].includes(post.status)).length,
      draft: posts.filter((post) => post.status === "draft").length,
      failed: posts.filter((post) => post.status === "failed").length,
    }),
    [posts]
  );

  const recentPosts = posts.slice(0, 5);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Track publishing activity and jump back into your workflow.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="quill-card p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 h-9 w-16 animate-pulse rounded bg-slate-200" />
              </div>
            ))
          : [
              { label: "Total Published", value: metrics.published },
              { label: "Scheduled", value: metrics.scheduled },
              { label: "Draft", value: metrics.draft },
              { label: "Needs Attention", value: metrics.failed },
            ].map((metric) => (
              <div key={metric.label} className="quill-card p-5">
                <p className="text-sm text-muted">{metric.label}</p>
                <p
                  className={`mt-3 text-3xl font-semibold ${
                    metric.label === "Needs Attention" && metric.value > 0
                      ? "text-red-600"
                      : "text-ink"
                  }`}
                >
                  {metric.value}
                </p>
              </div>
            ))}
      </div>

      <div className="quill-card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">Recent posts</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-slate-50 text-left text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Content preview</th>
                <th className="px-5 py-3 font-medium">Voice DNA</th>
                <th className="px-5 py-3 font-medium">Platforms</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td className="px-5 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-8 w-44 animate-pulse rounded-full bg-slate-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                    </td>
                  </tr>
                ))}
              {!loading && !loadError && recentPosts.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-muted" colSpan={5}>
                    No posts yet.
                  </td>
                </tr>
              )}
              {!loading && loadError && (
                <tr>
                  <td className="px-5 py-8 text-muted" colSpan={5}>
                    {loadError}
                  </td>
                </tr>
              )}
              {recentPosts.map((post) => {
                const failureSummary = getFailureSummary(post);

                return (
                  <tr key={post.id}>
                    <td className="max-w-xl px-5 py-4 text-ink">
                      <p className="line-clamp-2">{post.content}</p>
                    </td>
                    <td className="px-5 py-4">
                      <VoiceScoreBadge
                        score={post.voiceScore}
                        toneScore={post.voiceToneScore}
                        rhythmScore={post.voiceRhythmScore}
                        wordChoiceScore={post.voiceWordChoiceScore}
                        safeToPublish={post.voiceSafeToPublish}
                        variant="compact"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {post.platforms.map((platform) => (
                          <PlatformBadge key={`${post.id}-${platform}`} platform={platform} />
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <StatusBadge value={post.status} />
                        {failureSummary && (
                          <div className="flex max-w-[13rem] items-start gap-1.5 text-xs leading-5 text-red-600">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{failureSummary}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <Link href="/compose">
          <Button>Compose new post →</Button>
        </Link>
      </div>
    </section>
  );
}
