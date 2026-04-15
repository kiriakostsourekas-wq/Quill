import { format, startOfDay, startOfWeek, subDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export async function GET(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const ninetyDaysAgo = subDays(now, 90);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const [scoredPosts, bestPost, lowestPosts, publishedPosts] = await Promise.all([
    prisma.post.findMany({
      where: {
        userId: user.id,
        voiceScore: { not: null },
        lastVoiceScoredAt: { gte: ninetyDaysAgo },
      },
      select: {
        id: true,
        content: true,
        voiceScore: true,
        voiceToneScore: true,
        voiceRhythmScore: true,
        voiceWordChoiceScore: true,
        lastVoiceScoredAt: true,
      },
      orderBy: {
        lastVoiceScoredAt: "asc",
      },
    }),
    prisma.post.findFirst({
      where: {
        userId: user.id,
        voiceScore: { not: null },
      },
      orderBy: [{ voiceScore: "desc" }, { lastVoiceScoredAt: "desc" }],
      select: {
        id: true,
        content: true,
        voiceScore: true,
      },
    }),
    prisma.post.findMany({
      where: {
        userId: user.id,
        voiceScore: { not: null },
      },
      orderBy: [{ voiceScore: "asc" }, { lastVoiceScoredAt: "desc" }],
      take: 3,
      select: {
        id: true,
        content: true,
        voiceScore: true,
      },
    }),
    prisma.post.findMany({
      where: {
        userId: user.id,
        publishedAt: { not: null },
      },
      select: {
        publishedAt: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
    }),
  ]);

  const recentThirtyDays = scoredPosts.filter(
    (post) => post.lastVoiceScoredAt && post.lastVoiceScoredAt >= thirtyDaysAgo
  );
  const recentSevenDays = scoredPosts.filter(
    (post) => post.lastVoiceScoredAt && post.lastVoiceScoredAt >= subDays(now, 7)
  );
  const previousSevenDays = scoredPosts.filter(
    (post) =>
      post.lastVoiceScoredAt &&
      post.lastVoiceScoredAt >= subDays(now, 14) &&
      post.lastVoiceScoredAt < subDays(now, 7)
  );

  const historyDays = Array.from({ length: 90 }, (_, index) => {
    const date = startOfDay(subDays(now, 89 - index));
    return {
      date: format(date, "yyyy-MM-dd"),
      score: null as number | null,
    };
  });

  const buckets = new Map(
    historyDays.map((entry) => [entry.date, [] as number[]])
  );

  for (const post of scoredPosts) {
    if (!post.lastVoiceScoredAt || post.voiceScore == null) continue;
    const key = format(startOfDay(post.lastVoiceScoredAt), "yyyy-MM-dd");
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(post.voiceScore);
    }
  }

  const history = historyDays.map((entry) => {
    const scores = buckets.get(entry.date) ?? [];
    return {
      date: entry.date,
      score: average(scores),
    };
  });

  const publishedDays = new Set(
    publishedPosts
      .map((post) => (post.publishedAt ? startOfDay(post.publishedAt).getTime() : null))
      .filter((value): value is number => value !== null)
  );

  let consistencyStreak = 0;
  let cursor = startOfDay(now);
  while (publishedDays.has(cursor.getTime())) {
    consistencyStreak += 1;
    cursor = subDays(cursor, 1);
  }

  return NextResponse.json({
    averageVoiceScore: average(
      recentThirtyDays.map((post) => post.voiceScore ?? 0).filter((value) => Number.isFinite(value))
    ),
    totalPostsThisWeek: await prisma.post.count({
      where: {
        userId: user.id,
        voiceScore: { not: null },
        lastVoiceScoredAt: { gte: weekStart },
      },
    }),
    bestPost: bestPost
      ? {
          id: bestPost.id,
          content: bestPost.content,
          score: bestPost.voiceScore,
        }
      : null,
    consistencyStreak,
    trend:
      average(recentSevenDays.map((post) => post.voiceScore ?? 0).filter((value) => Number.isFinite(value))) !=
        null &&
      average(previousSevenDays.map((post) => post.voiceScore ?? 0).filter((value) => Number.isFinite(value))) != null
        ? (average(recentSevenDays.map((post) => post.voiceScore ?? 0).filter((value) => Number.isFinite(value))) ??
            0) -
          (average(previousSevenDays.map((post) => post.voiceScore ?? 0).filter((value) => Number.isFinite(value))) ??
            0)
        : null,
    breakdownAverages: {
      tone: average(
        recentThirtyDays
          .map((post) => post.voiceToneScore)
          .filter((value): value is number => value !== null)
      ),
      rhythm: average(
        recentThirtyDays
          .map((post) => post.voiceRhythmScore)
          .filter((value): value is number => value !== null)
      ),
      wordChoice: average(
        recentThirtyDays
          .map((post) => post.voiceWordChoiceScore)
          .filter((value): value is number => value !== null)
      ),
    },
    history,
    mostAuthenticPosts: scoredPosts
      .filter((post) => post.voiceScore != null)
      .sort((a, b) => (b.voiceScore ?? 0) - (a.voiceScore ?? 0))
      .slice(0, 3)
      .map((post) => ({
        id: post.id,
        content: post.content,
        score: post.voiceScore,
      })),
    lowestScoringPosts: lowestPosts.map((post) => ({
      id: post.id,
      content: post.content,
      score: post.voiceScore,
    })),
  });
}
