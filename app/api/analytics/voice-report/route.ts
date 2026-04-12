import { startOfDay, startOfWeek, subDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const [recentScoredPosts, bestPost, publishedPosts] = await Promise.all([
    prisma.post.findMany({
      where: {
        userId: user.id,
        voiceScore: { not: null },
        lastVoiceScoredAt: { gte: thirtyDaysAgo },
      },
      select: {
        voiceScore: true,
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

  const averageVoiceScore =
    recentScoredPosts.length > 0
      ? Math.round(
          recentScoredPosts.reduce((sum, post) => sum + (post.voiceScore ?? 0), 0) /
            recentScoredPosts.length
        )
      : null;

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
    averageVoiceScore,
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
  });
}
