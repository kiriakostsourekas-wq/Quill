"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type AnalyticsState = {
  totalPublished: number;
  publishedThisMonth: number;
  publishedThisWeek: number;
  topPlatform: string | null;
  chart: Array<{ date: string; count: number }>;
};

type VoiceReportState = {
  averageVoiceScore: number | null;
  totalPostsThisWeek: number;
  consistencyStreak: number;
  bestPost: {
    id: string;
    content: string;
    score: number | null;
  } | null;
};

function AnalyticsSkeleton() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
      </div>
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

export function AnalyticsClient() {
  const [analytics, setAnalytics] = useState<AnalyticsState | null>(null);
  const [voiceReport, setVoiceReport] = useState<VoiceReportState | null>(null);
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

  const voiceBadgeClasses =
    (voiceReport?.averageVoiceScore ?? 0) > 80
      ? "bg-emerald-50 text-emerald-700"
      : (voiceReport?.averageVoiceScore ?? 0) >= 60
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Track publishing volume and see where your activity is concentrated.
        </p>
      </div>

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
              See how consistently your published work matches the voice you trained.
            </p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${voiceBadgeClasses}`}>
            Avg score: {voiceReport?.averageVoiceScore ?? "—"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-line p-4">
            <p className="text-sm text-muted">Consistency streak</p>
            <p className="mt-2 text-2xl font-semibold text-ink">
              {voiceReport?.consistencyStreak ?? 0} days
            </p>
          </div>

          <div className="rounded-lg border border-line p-4">
            <p className="text-sm text-muted">Scored this week</p>
            <p className="mt-2 text-2xl font-semibold text-ink">
              {voiceReport?.totalPostsThisWeek ?? 0}
            </p>
          </div>

          <div className="rounded-lg border border-line p-4">
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
              <p className="mt-2 text-xs text-muted">
                Highest score: {voiceReport.bestPost.score}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="quill-card p-6">
        <h2 className="text-lg font-semibold text-ink">Last 30 Days</h2>
        <div className="mt-6 h-[320px]">
          {analytics?.chart?.some((entry) => entry.count > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.chart}>
                <CartesianGrid stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                  tickFormatter={(value) => value.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#EEEDFE" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #E5E7EB",
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
