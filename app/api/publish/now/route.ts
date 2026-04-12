import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  claimAndPublishPost,
  ImmutablePostError,
  PublishConflictError,
  hasPublishedDelivery,
  syncPostDeliveries,
} from "@/lib/publishing";
import { scoreVoiceTextForUser, toStoredVoiceFields } from "@/lib/voice-dna";

const publishNowSchema = z.object({
  postId: z.string().optional(),
  content: z.string().trim().min(1),
  platforms: z.array(z.enum(["linkedin", "twitter"])).min(1).max(2),
});

function normalizedPlatforms(platforms: string[]) {
  return [...new Set(platforms)].sort();
}

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
  const { result } = await scoreVoiceTextForUser(user.id, parsed.data.content);

  if (postId) {
    const existing = await prisma.post.findFirst({
      where: {
        id: postId,
        userId: user.id,
      },
      include: {
        deliveries: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const publishedDeliveryExists = hasPublishedDelivery(existing.deliveries);
    const contentChanged = existing.content !== parsed.data.content;
    const platformsChanged =
      JSON.stringify(normalizedPlatforms(existing.platforms)) !==
      JSON.stringify(normalizedPlatforms(parsed.data.platforms));

    if (existing.status === "publishing") {
      return NextResponse.json(
        { error: "Post is already being published" },
        { status: 409 }
      );
    }

    if (existing.status === "published") {
      return NextResponse.json(
        { error: "Published posts cannot be republished" },
        { status: 409 }
      );
    }

    if (publishedDeliveryExists && (contentChanged || platformsChanged)) {
      return NextResponse.json(
        { error: "Partially published posts cannot be changed" },
        { status: 409 }
      );
    }

    await prisma.post.update({
      where: { id: existing.id },
      data: {
        content: contentChanged ? parsed.data.content : existing.content,
        platforms: platformsChanged ? [...new Set(parsed.data.platforms)] : existing.platforms,
        scheduledAt: null,
        status: publishedDeliveryExists ? existing.status : "draft",
        errorLog: null,
        publishLeaseId: null,
        publishLeaseExpiresAt: null,
        ...toStoredVoiceFields(result),
      },
    });

    if (platformsChanged) {
      await syncPostDeliveries(existing.id, parsed.data.platforms);
    }
  } else {
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        content: parsed.data.content,
        platforms: [...new Set(parsed.data.platforms)],
        status: "draft",
        ...toStoredVoiceFields(result),
      },
    });
    await syncPostDeliveries(post.id, parsed.data.platforms);
    postId = post.id;
  }

  try {
    const post = await claimAndPublishPost(postId, "manual", user.id);
    return NextResponse.json({ post });
  } catch (error) {
    if (error instanceof PublishConflictError || error instanceof ImmutablePostError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Publishing failed",
      },
      { status: 400 }
    );
  }
}
