import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishPostById } from "@/lib/publishing";

const publishNowSchema = z.object({
  postId: z.string().optional(),
  content: z.string().trim().min(1),
  platforms: z.array(z.enum(["linkedin", "twitter"])).min(1).max(2),
});

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const parsed = publishNowSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid publish payload" },
      { status: 400 }
    );
  }

  let postId = parsed.data.postId;

  if (postId) {
    const existing = await prisma.post.findFirst({
      where: {
        id: postId,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.post.update({
      where: { id: existing.id },
      data: {
        content: parsed.data.content,
        platforms: [...new Set(parsed.data.platforms)],
        scheduledAt: null,
        status: "draft",
        errorLog: null,
      },
    });
  } else {
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        content: parsed.data.content,
        platforms: [...new Set(parsed.data.platforms)],
        status: "draft",
      },
    });
    postId = post.id;
  }

  try {
    const post = await publishPostById(postId, user.id);
    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Publishing failed",
      },
      { status: 400 }
    );
  }
}
