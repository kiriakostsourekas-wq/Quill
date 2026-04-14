import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import {
  buildCarouselContent,
  MAX_CAROUSEL_BODY,
  MAX_CAROUSEL_HEADLINE,
} from "@/lib/carousel";
import { prisma } from "@/lib/prisma";
import { ImmutablePostError, isPostImmutable, syncPostDeliveries } from "@/lib/publishing";
import { scoreVoiceTextForUser, toStoredVoiceFields } from "@/lib/voice-dna";

const platformSchema = z.enum(["linkedin", "twitter"]);
const carouselSlideSchema = z.object({
  headline: z.string().trim().max(MAX_CAROUSEL_HEADLINE, "Headline must be 60 characters or less"),
  body: z.string().trim().max(MAX_CAROUSEL_BODY, "Body must be 200 characters or less"),
});
const scheduledAtSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid scheduled date");
const firstCommentSchema = z
  .string()
  .trim()
  .max(1250, "First comment must be 1250 characters or less");

const updatePostSchema = z.object({
  postType: z.enum(["text", "carousel"]).optional(),
  content: z.string().trim().min(1).optional(),
  platforms: z.array(platformSchema).min(1).max(2).optional(),
  scheduledAt: scheduledAtSchema.nullable().optional(),
  firstComment: firstCommentSchema.nullable().optional(),
  carouselSlides: z.array(carouselSlideSchema).min(2).max(10).optional(),
  coverSlide: z.boolean().optional(),
  status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
}).superRefine((data, ctx) => {
  if (data.postType === "carousel" && !data.carouselSlides) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Carousel posts require slide data",
      path: ["carouselSlides"],
    });
  }
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
    include: {
      deliveries: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (isPostImmutable(existing)) {
    return NextResponse.json(
      { error: "Published or in-flight posts cannot be edited" },
      { status: 409 }
    );
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

  const nextPostType = parsed.data.postType ?? existing.postType;
  const nextPlatforms = parsed.data.platforms
    ? [...new Set(parsed.data.platforms)]
    : existing.platforms;
  const nextCarouselSlides =
    parsed.data.carouselSlides !== undefined
      ? parsed.data.carouselSlides
      : ((existing.carouselSlides as { headline: string; body: string }[] | null) ?? null);
  const nextContent =
    nextPostType === "carousel"
      ? buildCarouselContent(nextCarouselSlides ?? [])
      : parsed.data.content ?? existing.content;
  const nextFirstComment = nextPlatforms.includes("linkedin")
    ? parsed.data.firstComment === undefined
      ? existing.firstComment
      : parsed.data.firstComment?.trim() || null
    : null;
  const { result } = nextContent.trim()
    ? await scoreVoiceTextForUser(user.id, nextContent)
    : { result: null };

  const post = await prisma.post.update({
    where: { id: existing.id },
    data: {
      postType: nextPostType,
      content: nextContent,
      firstComment: nextFirstComment,
      carouselSlides:
        nextPostType === "carousel" ? nextCarouselSlides ?? [] : Prisma.JsonNull,
      coverSlide:
        nextPostType === "carousel"
          ? parsed.data.coverSlide ?? existing.coverSlide
          : false,
      platforms: nextPlatforms,
      scheduledAt: nextScheduledAt,
      status: nextStatus,
      errorLog: nextStatus === "failed" ? existing.errorLog : null,
      ...toStoredVoiceFields(result),
    },
  });

  try {
    await syncPostDeliveries(post.id, nextPlatforms);
  } catch (error) {
    if (error instanceof ImmutablePostError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

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
    include: {
      deliveries: true,
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (isPostImmutable(post)) {
    return NextResponse.json(
      { error: "Published or in-flight posts cannot be deleted" },
      { status: 409 }
    );
  }

  await prisma.post.delete({ where: { id: post.id } });
  return NextResponse.json({ success: true });
}
