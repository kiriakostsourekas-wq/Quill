import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import {
  CAROUSEL_BACKGROUND_PRESETS,
  CAROUSEL_MODES,
  buildCarouselContent,
  MAX_CAROUSEL_BODY,
  MAX_CAROUSEL_HEADLINE,
  MAX_CAROUSEL_TITLE,
  normalizeCarouselSlides,
  type CarouselSlide,
} from "@/lib/carousel";
import { PlanLimitError, assertPlanAllowsPlatforms } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { ImmutablePostError, isPostImmutable, syncPostDeliveries } from "@/lib/publishing";
import {
  AUTO_SCHEDULING_ENABLED,
  AUTO_SCHEDULING_UNAVAILABLE_MESSAGE,
} from "@/lib/scheduling";
import { scoreVoiceTextForUser, toStoredVoiceFields } from "@/lib/voice-dna";
import { readRequestJson } from "@/lib/utils";

const platformSchema = z.enum(["linkedin", "twitter"]);
const carouselSlideSchema = z.object({
  headline: z.string().trim().max(MAX_CAROUSEL_HEADLINE, "Headline must be 60 characters or less"),
  body: z.string().trim().max(MAX_CAROUSEL_BODY, "Body must be 200 characters or less"),
  background: z.enum(CAROUSEL_BACKGROUND_PRESETS.map((preset) => preset.key) as [string, ...string[]]),
  imageDataUrl: z
    .string()
    .trim()
    .refine((value) => value.startsWith("data:image/"), "Slide images must be JPG or PNG data URLs")
    .nullable()
    .optional(),
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
  content: z.string().trim().optional(),
  documentTitle: z.string().trim().max(MAX_CAROUSEL_TITLE, "Title must be 120 characters or less").optional(),
  carouselMode: z.enum(CAROUSEL_MODES).optional(),
  platforms: z.array(platformSchema).min(1).max(2).optional(),
  scheduledAt: scheduledAtSchema.nullable().optional(),
  firstComment: firstCommentSchema.nullable().optional(),
  carouselSlides: z.array(carouselSlideSchema).min(2).max(10).optional(),
  carouselDocumentBase64: z.string().trim().nullable().optional(),
  coverSlide: z.boolean().optional(),
  status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
}).superRefine((data, ctx) => {
  if (data.postType === "carousel") {
    const mode = data.carouselMode ?? "builder";
    if (mode === "builder" && !data.carouselSlides) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Carousel posts require slide data",
        path: ["carouselSlides"],
      });
    }

    if (mode === "upload" && data.carouselDocumentBase64 !== undefined && !data.carouselDocumentBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Upload mode requires a PDF document",
        path: ["carouselDocumentBase64"],
      });
    }
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

  const body = await readRequestJson<unknown>(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const parsed = updatePostSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid post payload",
      },
      { status: 400 }
    );
  }

  const nextPlatforms = parsed.data.platforms
    ? [...new Set(parsed.data.platforms)]
    : existing.platforms;

  try {
    assertPlanAllowsPlatforms(user, nextPlatforms);
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const nextScheduledAt =
    parsed.data.scheduledAt === undefined
      ? existing.scheduledAt
      : parsed.data.scheduledAt
        ? new Date(parsed.data.scheduledAt)
        : null;

  if (nextScheduledAt && nextScheduledAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "Scheduled time must be in the future" },
      { status: 400 }
    );
  }

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

  if (nextStatus === "scheduled" && !AUTO_SCHEDULING_ENABLED) {
    return NextResponse.json(
      { error: AUTO_SCHEDULING_UNAVAILABLE_MESSAGE },
      { status: 409 }
    );
  }

  const nextPostType = parsed.data.postType ?? existing.postType;
  const nextCarouselMode =
    nextPostType === "carousel"
      ? parsed.data.carouselMode ?? existing.carouselMode ?? "builder"
      : null;
  const nextCarouselSlides =
    parsed.data.carouselSlides !== undefined
      ? parsed.data.carouselSlides
      : ((existing.carouselSlides as CarouselSlide[] | null) ?? null);
  const nextDocumentBase64 =
    parsed.data.carouselDocumentBase64 !== undefined
      ? parsed.data.carouselDocumentBase64?.trim() || null
      : existing.carouselDocumentBase64;
  const nextContent =
    nextPostType === "carousel"
      ? nextCarouselMode === "builder"
        ? buildCarouselContent(normalizeCarouselSlides(nextCarouselSlides ?? []))
        : parsed.data.content ?? existing.content
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
      documentTitle:
        nextPostType === "carousel"
          ? parsed.data.documentTitle?.trim() ?? existing.documentTitle
          : null,
      carouselMode: nextCarouselMode,
      carouselSlides:
        nextPostType === "carousel" && nextCarouselMode === "builder"
          ? nextCarouselSlides ?? []
          : Prisma.JsonNull,
      carouselDocumentBase64:
        nextPostType === "carousel" && nextCarouselMode === "upload"
          ? nextDocumentBase64
          : null,
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
