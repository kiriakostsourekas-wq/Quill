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
import { syncPostDeliveries } from "@/lib/publishing";
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
  .max(1250, "First comment must be 1250 characters or less")
  .optional();

const createPostSchema = z.object({
  postType: z.enum(["text", "carousel"]).default("text"),
  content: z.string().trim().optional(),
  platforms: z.array(platformSchema).min(1).max(2),
  scheduledAt: scheduledAtSchema.optional(),
  firstComment: firstCommentSchema.nullable().optional(),
  carouselSlides: z.array(carouselSlideSchema).min(2).max(10).optional(),
  coverSlide: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.postType === "carousel") {
    if (!data.carouselSlides || data.carouselSlides.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Carousel posts require at least 2 slides",
        path: ["carouselSlides"],
      });
      return;
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

  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
  const status = scheduledAt ? "scheduled" : "draft";
  const firstComment = parsed.data.platforms.includes("linkedin")
    ? parsed.data.firstComment?.trim() || null
    : null;
  const content =
    parsed.data.postType === "carousel"
      ? buildCarouselContent(parsed.data.carouselSlides ?? [])
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
      carouselSlides:
        parsed.data.postType === "carousel"
          ? parsed.data.carouselSlides ?? []
          : Prisma.JsonNull,
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
