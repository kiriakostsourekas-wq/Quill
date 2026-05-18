import { format, isAfter, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const deliveries = await prisma.postDelivery.findMany({
    where: {
      status: "published",
      post: {
        userId: user.id,
      },
    },
    select: {
      postId: true,
      platform: true,
      publishedAt: true,
    },
    orderBy: {
      publishedAt: "asc",
    },
  });
  const feedbackCounts = await prisma.postPerformanceFeedback.groupBy({
    by: ["outcome"],
    where: { userId: user.id },
    _count: { _all: true },
  });
  const recentFeedback = await prisma.postPerformanceFeedback.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 6,
    select: {
      id: true,
      postId: true,
      outcome: true,
      likes: true,
      comments: true,
      reposts: true,
      impressions: true,
      notes: true,
      updatedAt: true,
      post: {
        select: {
          postType: true,
          content: true,
          documentTitle: true,
        },
      },
    },
  });

  const publishedByPost = new Map<string, Date>();
  let linkedinCount = 0;
  let twitterCount = 0;

  for (const delivery of deliveries) {
    if (!delivery.publishedAt) continue;

    if (delivery.platform === "linkedin") linkedinCount += 1;
    if (delivery.platform === "twitter") twitterCount += 1;

    const existing = publishedByPost.get(delivery.postId);
    if (!existing || delivery.publishedAt < existing) {
      publishedByPost.set(delivery.postId, delivery.publishedAt);
    }
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const chartStart = startOfDay(subDays(now, 29));

  const chart = Array.from({ length: 30 }, (_, index) => {
    const date = startOfDay(subDays(now, 29 - index));
    return {
      date: format(date, "yyyy-MM-dd"),
      count: 0,
    };
  });

  const chartLookup = new Map(chart.map((entry) => [entry.date, entry]));

  let publishedThisMonth = 0;
  let publishedThisWeek = 0;

  for (const publishedAt of publishedByPost.values()) {
    if (publishedAt >= monthStart) {
      publishedThisMonth += 1;
    }
    if (publishedAt >= weekStart) {
      publishedThisWeek += 1;
    }
    if (publishedAt >= chartStart || isAfter(publishedAt, chartStart)) {
      const key = format(startOfDay(publishedAt), "yyyy-MM-dd");
      const bucket = chartLookup.get(key);
      if (bucket) {
        bucket.count += 1;
      }
    }
  }

  return NextResponse.json({
    totalPublished: publishedByPost.size,
    publishedThisMonth,
    publishedThisWeek,
    topPlatform:
      linkedinCount === 0 && twitterCount === 0
        ? null
        : linkedinCount >= twitterCount
          ? "LinkedIn"
          : "X",
    chart,
    performanceFeedback: {
      totalLogged: feedbackCounts.reduce((sum, entry) => sum + entry._count._all, 0),
      counts: feedbackCounts.reduce(
        (acc, entry) => ({
          ...acc,
          [entry.outcome]: entry._count._all,
        }),
        {
          underperformed: 0,
          expected: 0,
          outperformed: 0,
        }
      ),
      recent: recentFeedback,
    },
  });
}
