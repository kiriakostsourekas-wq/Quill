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
} from "@/lib/carousel";
import { PlanLimitError, assertFreePlanPostLimit, assertPlanAllowsPlatforms } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { syncPostDeliveries } from "@/lib/publishing";
import { scoreVoiceTextForUser, toStoredVoiceFields } from "@/lib/voice-dna";

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
  .max(1250, "First comment must be 1250 characters or less")
  .optional();

const createPostSchema = z.object({
  postType: z.enum(["text", "carousel"]).default("text"),
  content: z.string().trim().optional(),
  documentTitle: z.string().trim().max(MAX_CAROUSEL_TITLE, "Title must be 120 characters or less").optional(),
  carouselMode: z.enum(CAROUSEL_MODES).optional(),
  platforms: z.array(platformSchema).min(1).max(2),
  scheduledAt: scheduledAtSchema.optional(),
  firstComment: firstCommentSchema.nullable().optional(),
  carouselSlides: z.array(carouselSlideSchema).min(2).max(10).optional(),
  carouselDocumentBase64: z.string().trim().nullable().optional(),
  coverSlide: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.postType === "carousel") {
    if (!data.documentTitle?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Carousel title is required",
        path: ["documentTitle"],
      });
    }

    const mode = data.carouselMode ?? "builder";
    if (mode === "builder" && (!data.carouselSlides || data.carouselSlides.length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Carousel posts require at least 2 slides",
        path: ["carouselSlides"],
      });
    }

    if (mode === "upload" && !data.carouselDocumentBase64?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Upload mode requires a PDF document",
        path: ["carouselDocumentBase64"],
      });
    }

    return;
  }

  if (!data.content?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Content is required",
      path: ["content"],
    });
  }
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
    include: {
      deliveries: {
        orderBy: { platform: "asc" },
        select: {
          platform: true,
          status: true,
          publishedAt: true,
          errorLog: true,
        },
      },
    },
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

  try {
    assertPlanAllowsPlatforms(user, parsed.data.platforms);
    await assertFreePlanPostLimit(user);
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
  const status = scheduledAt ? "scheduled" : "draft";
  const firstComment = parsed.data.platforms.includes("linkedin")
    ? parsed.data.firstComment?.trim() || null
    : null;
  const carouselMode = parsed.data.postType === "carousel" ? parsed.data.carouselMode ?? "builder" : null;
  const content =
    parsed.data.postType === "carousel"
      ? carouselMode === "builder"
        ? buildCarouselContent(normalizeCarouselSlides(parsed.data.carouselSlides ?? []))
        : parsed.data.content?.trim() ?? ""
      : parsed.data.content?.trim() ?? "";
  const { result } = content.trim()
    ? await scoreVoiceTextForUser(user.id, content)
    : { result: null };

  const post = await prisma.post.create({
    data: {
      userId: user.id,
      postType: parsed.data.postType,
      content,
      firstComment,
      documentTitle: parsed.data.postType === "carousel" ? parsed.data.documentTitle?.trim() ?? "Quill carousel" : null,
      carouselMode,
      carouselSlides:
        parsed.data.postType === "carousel" && carouselMode === "builder"
          ? parsed.data.carouselSlides ?? []
          : Prisma.JsonNull,
      carouselDocumentBase64:
        parsed.data.postType === "carousel" && carouselMode === "upload"
          ? parsed.data.carouselDocumentBase64?.trim() ?? null
          : null,
      coverSlide: parsed.data.postType === "carousel" ? parsed.data.coverSlide ?? false : false,
      platforms: [...new Set(parsed.data.platforms)],
      scheduledAt,
      status,
      ...toStoredVoiceFields(result),
    },
  });

  await syncPostDeliveries(post.id, parsed.data.platforms);

  return NextResponse.json({ post });
}
