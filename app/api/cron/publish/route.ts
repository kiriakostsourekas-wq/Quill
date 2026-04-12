import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishPostById } from "@/lib/publishing";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function runScheduledPublishSweep() {
  const duePosts = await prisma.post.findMany({
    where: {
      status: "scheduled",
      scheduledAt: {
        lte: new Date(),
      },
    },
    orderBy: {
      scheduledAt: "asc",
    },
    select: {
      id: true,
    },
  });

  let published = 0;
  const failed: { postId: string; error: string }[] = [];

  for (const post of duePosts) {
    try {
      await publishPostById(post.id);
      published += 1;
    } catch (error) {
      failed.push({
        postId: post.id,
        error: error instanceof Error ? error.message : "Publishing failed",
      });
    }
  }

  return {
    scanned: duePosts.length,
    published,
    failed,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runScheduledPublishSweep();
  return NextResponse.json(result);
}

