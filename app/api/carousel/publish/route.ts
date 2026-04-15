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
  type CarouselSlide,
} from "@/lib/carousel";
import { base64ToPdfBytes } from "@/lib/carousel-pdf";
import { getFreshLinkedInAccount, postLinkedInComment, uploadLinkedInDocument } from "@/lib/linkedin";
import { PlanLimitError, assertFreePlanPostLimit } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { scoreVoiceTextForUser, toStoredVoiceFields } from "@/lib/voice-dna";
import { readRequestJson } from "@/lib/utils";

const carouselSlideSchema = z.object({
  headline: z.string().trim().min(1, "Each slide needs a headline").max(MAX_CAROUSEL_HEADLINE),
  body: z.string().trim().max(MAX_CAROUSEL_BODY),
  background: z.enum(CAROUSEL_BACKGROUND_PRESETS.map((preset) => preset.key) as [string, ...string[]]),
  imageDataUrl: z
    .string()
    .trim()
    .refine((value) => value.startsWith("data:image/"), "Slide images must be JPG or PNG data URLs")
    .nullable()
    .optional(),
});

const publishCarouselSchema = z.object({
  postId: z.string().optional(),
  title: z.string().trim().min(1, "Title is required").max(MAX_CAROUSEL_TITLE),
  carouselMode: z.enum(CAROUSEL_MODES),
  slides: z.array(carouselSlideSchema).min(2).max(10).optional(),
  coverSlide: z.boolean().default(false),
  voiceText: z.string().trim().optional(),
  pdfBase64: z.string().trim().min(1, "PDF data is required"),
  firstComment: z
    .string()
    .trim()
    .max(1250, "First comment must be 1250 characters or less")
    .nullable()
    .optional(),
});

function extractPostUrn(response: Response, rawBody: string) {
  const candidates = [
    response.headers.get("x-linkedin-id"),
    response.headers.get("x-restli-id"),
    response.headers.get("location"),
    rawBody,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const match = candidate.match(/urn:li:[A-Za-z]+:\d+/);
    if (match) return match[0];

    try {
      const decoded = decodeURIComponent(candidate);
      const decodedMatch = decoded.match(/urn:li:[A-Za-z]+:\d+/);
      if (decodedMatch) return decodedMatch[0];
    } catch {
      // ignore invalid encoded candidates
    }
  }

  return null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const body = await readRequestJson<unknown>(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const parsed = publishCarouselSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid carousel payload" },
      { status: 400 }
    );
  }

  if (parsed.data.carouselMode === "builder" && (!parsed.data.slides || parsed.data.slides.length < 2)) {
    return NextResponse.json(
      { error: "Builder mode requires at least 2 slides" },
      { status: 400 }
    );
  }

  try {
    await assertFreePlanPostLimit(user, parsed.data.postId);
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const slides = (parsed.data.slides ?? []).map((slide) => ({
    headline: slide.headline.trim(),
    body: slide.body.trim(),
    background: slide.background,
    imageDataUrl: slide.imageDataUrl ?? null,
  })) as CarouselSlide[];
  const content =
    parsed.data.carouselMode === "builder"
      ? buildCarouselContent(slides)
      : parsed.data.voiceText?.trim() ?? "";
  const firstComment = parsed.data.firstComment?.trim() || null;
  const { result } = content.trim()
    ? await scoreVoiceTextForUser(user.id, content)
    : { result: null };

  const appUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { socialAccounts: true },
  });

  if (!appUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const linkedinAccount = appUser.socialAccounts.find((account) => account.platform === "linkedin");
  if (!linkedinAccount) {
    return NextResponse.json({ error: "Connect LinkedIn first" }, { status: 400 });
  }

  let postId = parsed.data.postId;
  let postRecord =
    postId
      ? await prisma.post.findFirst({
          where: {
            id: postId,
            userId: user.id,
          },
        })
      : null;

  if (postId && !postRecord) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (postRecord?.status === "published") {
    return NextResponse.json({ error: "Published carousels cannot be republished" }, { status: 409 });
  }

  if (postRecord?.status === "publishing") {
    return NextResponse.json({ error: "Carousel is already being published" }, { status: 409 });
  }

  postRecord = postRecord
    ? await prisma.post.update({
        where: { id: postRecord.id },
        data: {
          postType: "carousel",
          documentTitle: parsed.data.title.trim(),
          carouselMode: parsed.data.carouselMode,
          content,
          firstComment,
          carouselSlides:
            parsed.data.carouselMode === "builder" ? slides : Prisma.JsonNull,
          carouselDocumentBase64: parsed.data.pdfBase64,
          coverSlide: parsed.data.coverSlide,
          platforms: ["linkedin"],
          status: "publishing",
          scheduledAt: null,
          errorLog: null,
          publishLeaseId: null,
          publishLeaseExpiresAt: null,
          ...toStoredVoiceFields(result),
        },
      })
    : await prisma.post.create({
        data: {
          userId: user.id,
          postType: "carousel",
          documentTitle: parsed.data.title.trim(),
          carouselMode: parsed.data.carouselMode,
          content,
          firstComment,
          carouselSlides:
            parsed.data.carouselMode === "builder" ? slides : Prisma.JsonNull,
          carouselDocumentBase64: parsed.data.pdfBase64,
          coverSlide: parsed.data.coverSlide,
          platforms: ["linkedin"],
          status: "publishing",
          ...toStoredVoiceFields(result),
        },
      });

  postId = postRecord.id;

  await prisma.postDelivery.upsert({
    where: {
      postId_platform: {
        postId,
        platform: "linkedin",
      },
    },
    update: {
      status: "publishing",
      errorLog: null,
    },
    create: {
      postId,
      platform: "linkedin",
      status: "publishing",
    },
  });

  try {
    const pdfBytes = base64ToPdfBytes(parsed.data.pdfBase64);
    const { accessToken, account: freshAccount } = await getFreshLinkedInAccount(linkedinAccount);

    if (!freshAccount.accountId) {
      throw new Error("LinkedIn author ID is missing");
    }

    const title = parsed.data.title.trim();
    const assetUrn = await uploadLinkedInDocument(
      accessToken,
      freshAccount.accountId,
      pdfBytes,
      title
    );

    const publishResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: freshAccount.accountId,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: title,
            },
            shareMediaCategory: "DOCUMENT",
            media: [
              {
                status: "READY",
                media: assetUrn,
                title: { text: title },
                description: {
                  text: content || "Created with Quill",
                },
              },
            ],
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    if (!publishResponse.ok) {
      const details = await publishResponse.text();
      throw new Error(
        `LinkedIn carousel publish failed (${publishResponse.status}): ${details || "no response body"}`
      );
    }

    const rawBody = (await publishResponse.text()).trim();
    const postUrn = extractPostUrn(publishResponse, rawBody);

    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "published",
        publishedAt: new Date(),
        errorLog: null,
      },
    });

    await prisma.postDelivery.upsert({
      where: {
        postId_platform: {
          postId,
          platform: "linkedin",
        },
      },
      update: {
        status: "published",
        externalPostId: postUrn,
        metadata: { assetUrn },
        publishedAt: new Date(),
        errorLog: null,
      },
      create: {
        postId,
        platform: "linkedin",
        status: "published",
        externalPostId: postUrn,
        metadata: { assetUrn },
        publishedAt: new Date(),
      },
    });

    if (firstComment && postUrn) {
      try {
        await delay(2000);
        await postLinkedInComment(accessToken, postUrn, firstComment);
      } catch (error) {
        console.warn("LinkedIn carousel first comment failed", {
          postId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ success: true, postUrn, postId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish carousel";
    await prisma.$transaction([
      prisma.post.update({
        where: { id: postId },
        data: {
          status: "failed",
          errorLog: message,
        },
      }),
      prisma.postDelivery.upsert({
        where: {
          postId_platform: {
            postId,
            platform: "linkedin",
          },
        },
        update: {
          status: "failed",
          errorLog: message,
        },
        create: {
          postId,
          platform: "linkedin",
          status: "failed",
          errorLog: message,
        },
      }),
    ]);

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
