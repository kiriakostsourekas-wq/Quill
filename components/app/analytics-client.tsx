"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { VoiceScoreBadge, getVoiceScoreTone } from "@/components/app/voice-score-badge";

type AnalyticsState = {
  totalPublished: number;
  publishedThisMonth: number;
  publishedThisWeek: number;
  topPlatform: string | null;
  chart: Array<{ date: string; count: number }>;
};

type VoicePostPreview = {
  id: string;
  content: string;
  score: number | null;
};

type VoiceReportState = {
  averageVoiceScore: number | null;
  totalPostsThisWeek: number;
  consistencyStreak: number;
  bestPost: VoicePostPreview | null;
  trend: number | null;
  breakdownAverages: {
    tone: number | null;
    rhythm: number | null;
    wordChoice: number | null;
  };
  history: Array<{ date: string; score: number | null }>;
  mostAuthenticPosts: VoicePostPreview[];
  lowestScoringPosts: VoicePostPreview[];
};

function AnalyticsSkeleton({ embedded = false }: { embedded?: boolean }) {
  return (
    <section className="space-y-6">
      {!embedded && (
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="quill-card p-5">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-9 w-16 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="quill-card p-6">
        <div className="h-[320px] animate-pulse rounded bg-slate-100" />
      </div>
    </section>
  );
}

function PostScoreList({
  title,
  posts,
}: {
  title: string;
  posts: VoicePostPreview[];
}) {
  return (
    <div className="rounded-2xl border border-line p-5">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <div className="mt-4 space-y-3">
        {posts.length === 0 ? (
          <p className="text-sm text-muted">No scored posts yet.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-3 text-sm leading-6 text-ink">{post.content}</p>
                <VoiceScoreBadge score={post.score} variant="compact" className="shrink-0" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AnalyticsClient({ embedded = false }: { embedded?: boolean }) {
  const [analytics, setAnalytics] = useState<AnalyticsState | null>(null);
  const [voiceReport, setVoiceReport] = useState<VoiceReportState | null>(null);
  const [historyWindow, setHistoryWindow] = useState<30 | 90>(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/analytics"), fetch("/api/analytics/voice-report")])
      .then(async ([analyticsResponse, voiceResponse]) => {
        const [analyticsData, voiceData] = await Promise.all([
          analyticsResponse.json(),
          voiceResponse.json(),
        ]);
        setAnalytics(analyticsData);
        setVoiceReport(voiceData);
      })
      .catch(() => {
        setAnalytics(null);
        setVoiceReport(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const voiceTone = getVoiceScoreTone(voiceReport?.averageVoiceScore);
  const filteredHistory = useMemo(() => {
    const history = voiceReport?.history ?? [];
    return history.slice(historyWindow === 30 ? -30 : -90);
  }, [historyWindow, voiceReport?.history]);

  const trendValue = voiceReport?.trend ?? null;
  const trendCopy =
    trendValue == null
      ? "No trend yet"
      : trendValue > 0
        ? `+${trendValue} vs previous week`
        : `${trendValue} vs previous week`;

  if (loading) {
    return <AnalyticsSkeleton embedded={embedded} />;
  }

  return (
    <section className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Track publishing volume and see how consistently your posts sound like you.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Published", value: analytics?.totalPublished ?? 0 },
          { label: "This Month", value: analytics?.publishedThisMonth ?? 0 },
          { label: "This Week", value: analytics?.publishedThisWeek ?? 0 },
          { label: "Top Platform", value: analytics?.topPlatform ?? "—" },
        ].map((metric) => (
          <div key={metric.label} className="quill-card p-5">
            <p className="text-sm text-muted">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold text-ink">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="quill-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Voice Health</h2>
            <p className="mt-1 text-sm text-muted">
              Keep Voice DNA front and center as your publishing habit scales.
            </p>
          </div>
          <VoiceScoreBadge
            score={voiceReport?.averageVoiceScore}
            toneScore={voiceReport?.breakdownAverages.tone}
            rhythmScore={voiceReport?.breakdownAverages.rhythm}
            wordChoiceScore={voiceReport?.breakdownAverages.wordChoice}
            variant="compact"
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm text-muted">Consistency streak</p>
            <p className="mt-2 text-2xl font-semibold text-ink">
              {voiceReport?.consistencyStreak ?? 0} days
            </p>
          </div>

          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm text-muted">Scored this week</p>
            <p className="mt-2 text-2xl font-semibold text-ink">
              {voiceReport?.totalPostsThisWeek ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm text-muted">Best post</p>
            <p
              className="mt-2 text-sm leading-6 text-ink"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
              }}
            >
              {voiceReport?.bestPost?.content ?? "No scored posts yet."}
            </p>
            {voiceReport?.bestPost?.score !== null && voiceReport?.bestPost?.score !== undefined && (
              <p className="mt-2 text-xs font-medium text-muted">
                Highest score: {voiceReport.bestPost.score}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="quill-card p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">Authenticity History</h2>
                <p className="mt-1 text-sm text-muted">
                  Watch your Voice DNA score trend over time and catch drift before it reaches your audience.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${voiceTone.bg} ${voiceTone.text}`}
                >
                  Average {voiceReport?.averageVoiceScore ?? "—"}
                </div>
                <div className="inline-flex rounded-full border border-line bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setHistoryWindow(30)}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      historyWindow === 30 ? "bg-brand text-white" : "text-muted"
                    }`}
                  >
                    30 days
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryWindow(90)}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      historyWindow === 90 ? "bg-brand text-white" : "text-muted"
                    }`}
                  >
                    90 days
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-muted">
              {trendValue != null && trendValue >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-amber-600" />
              )}
              <span>{trendCopy}</span>
            </div>

            <div className="mt-6 h-[320px]">
              {filteredHistory.some((entry) => entry.score !== null) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredHistory}>
                    <CartesianGrid stroke="rgb(var(--color-line))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "rgb(var(--color-muted))", fontSize: 12 }}
                      tickFormatter={(value) => value.slice(5)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "rgb(var(--color-muted))", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ stroke: "#534AB7", strokeDasharray: "4 4" }}
                      contentStyle={{
                        borderRadius: 16,
                        border: "1px solid rgb(var(--color-line))",
                        backgroundColor: "rgb(var(--color-surface))",
                        color: "rgb(var(--color-ink))",
                        boxShadow: "none",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#534AB7"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#534AB7" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
                  No Voice DNA history yet.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="quill-card p-6">
              <h2 className="text-lg font-semibold text-ink">Breakdown averages</h2>
              <p className="mt-1 text-sm text-muted">
                Where your voice is strongest over the last 30 days.
              </p>
              <div className="mt-6 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        label: "Tone",
                        value: voiceReport?.breakdownAverages.tone ?? 0,
                      },
                      {
                        label: "Rhythm",
                        value: voiceReport?.breakdownAverages.rhythm ?? 0,
                      },
                      {
                        label: "Word Choice",
                        value: voiceReport?.breakdownAverages.wordChoice ?? 0,
                      },
                    ]}
                  >
                    <CartesianGrid stroke="rgb(var(--color-line))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "rgb(var(--color-muted))", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "rgb(var(--color-muted))", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#EEEDFE" }}
                      contentStyle={{
                        borderRadius: 16,
                        border: "1px solid rgb(var(--color-line))",
                        backgroundColor: "rgb(var(--color-surface))",
                        color: "rgb(var(--color-ink))",
                        boxShadow: "none",
                      }}
                    />
                    <Bar dataKey="value" fill="#534AB7" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <PostScoreList
                title="Most authentic posts"
                posts={voiceReport?.mostAuthenticPosts ?? []}
              />
              <PostScoreList
                title="Lowest scoring posts"
                posts={voiceReport?.lowestScoringPosts ?? []}
              />
            </div>
          </div>

      <div className="quill-card p-6">
        <h2 className="text-lg font-semibold text-ink">Last 30 Days</h2>
        <div className="mt-6 h-[320px]">
          {analytics?.chart?.some((entry) => entry.count > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.chart}>
                <CartesianGrid stroke="rgb(var(--color-line))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgb(var(--color-muted))", fontSize: 12 }}
                  tickFormatter={(value) => value.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#EEEDFE" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgb(var(--color-line))",
                    backgroundColor: "rgb(var(--color-surface))",
                    color: "rgb(var(--color-ink))",
                    boxShadow: "none",
                  }}
                />
                <Bar dataKey="count" fill="#534AB7" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
              No published-post data yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
