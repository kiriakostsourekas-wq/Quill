import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { schedulePost } from "@/lib/queue";

const platformSchema = z.enum(["linkedin", "twitter"]);

const createPostSchema = z.object({
  content: z.string().trim().min(1, "Content is required"),
  platforms: z.array(platformSchema).min(1).max(2),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const status = request.nextUrl.searchParams.get("status");
  const posts = await prisma.post.findMany({
    where: {
      userId: user.id,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const parsed = createPostSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid post payload",
      },
      { status: 400 }
    );
  }

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
  const status = scheduledAt ? "scheduled" : "draft";

  const post = await prisma.post.create({
    data: {
      userId: user.id,
      content: parsed.data.content,
      platforms: [...new Set(parsed.data.platforms)],
      scheduledAt,
      status,
    },
  });

  if (scheduledAt) {
    try {
      await schedulePost(post.id, scheduledAt.getTime() - Date.now());
    } catch (error) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "failed",
          errorLog: error instanceof Error ? error.message : "Scheduling failed",
        },
      });
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Scheduling failed",
        },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ post });
}
