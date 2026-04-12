import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const platformSchema = z.enum(["linkedin", "twitter"]);

const updatePostSchema = z.object({
  content: z.string().trim().min(1).optional(),
  platforms: z.array(platformSchema).min(1).max(2).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const existing = await prisma.post.findFirst({
    where: {
      id: context.params.id,
      userId: user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const parsed = updatePostSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid post payload",
      },
      { status: 400 }
    );
  }

  const nextScheduledAt =
    parsed.data.scheduledAt === undefined
      ? existing.scheduledAt
      : parsed.data.scheduledAt
        ? new Date(parsed.data.scheduledAt)
        : null;

  let nextStatus = parsed.data.status ?? existing.status;

  if (parsed.data.scheduledAt !== undefined) {
    nextStatus = nextScheduledAt ? "scheduled" : nextStatus === "scheduled" ? "draft" : nextStatus;
  }

  if (nextStatus === "scheduled" && !nextScheduledAt) {
    return NextResponse.json(
      { error: "scheduledAt is required when status is scheduled" },
      { status: 400 }
    );
  }

  const post = await prisma.post.update({
    where: { id: existing.id },
    data: {
      content: parsed.data.content ?? existing.content,
      platforms: parsed.data.platforms
        ? [...new Set(parsed.data.platforms)]
        : existing.platforms,
      scheduledAt: nextScheduledAt,
      status: nextStatus,
      errorLog: nextStatus === "failed" ? existing.errorLog : null,
    },
  });

  return NextResponse.json({ post });
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const post = await prisma.post.findFirst({
    where: {
      id: context.params.id,
      userId: user.id,
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await prisma.post.delete({ where: { id: post.id } });
  return NextResponse.json({ success: true });
}
