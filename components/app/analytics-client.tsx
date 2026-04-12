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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((response) => response.json())
      .then((data) => setAnalytics(data))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, []);

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
