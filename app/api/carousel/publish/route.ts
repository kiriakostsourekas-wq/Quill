import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import {
  buildCarouselContent,
  MAX_CAROUSEL_BODY,
  MAX_CAROUSEL_HEADLINE,
  type CarouselSlide,
} from "@/lib/carousel";
import { generateCarouselPDF } from "@/lib/carousel-pdf";
import {
  getFreshLinkedInAccount,
  postLinkedInComment,
  uploadLinkedInDocument,
} from "@/lib/linkedin";
import { prisma } from "@/lib/prisma";
import { scoreVoiceTextForUser, toStoredVoiceFields } from "@/lib/voice-dna";

const carouselSlideSchema = z.object({
  headline: z.string().trim().min(1, "Each slide needs a headline").max(MAX_CAROUSEL_HEADLINE),
  body: z.string().trim().max(MAX_CAROUSEL_BODY),
});

const publishCarouselSchema = z.object({
  postId: z.string().optional(),
  slides: z.array(carouselSlideSchema).min(2).max(10),
  coverSlide: z.boolean().default(false),
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

  const parsed = publishCarouselSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid carousel payload" },
      { status: 400 }
    );
  }

  const slides = parsed.data.slides.map((slide) => ({
    headline: slide.headline.trim(),
    body: slide.body.trim(),
  }));
  const content = buildCarouselContent(slides);
  const firstComment = parsed.data.firstComment?.trim() || null;
  const { result } = await scoreVoiceTextForUser(user.id, content);

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
          content,
          firstComment,
          carouselSlides: slides,
          coverSlide: parsed.data.coverSlide,
          platforms: ["linkedin"],
          status: "draft",
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
          content,
          firstComment,
          carouselSlides: slides,
          coverSlide: parsed.data.coverSlide,
          platforms: ["linkedin"],
          status: "draft",
          ...toStoredVoiceFields(result),
        },
      });

  postId = postRecord.id;

  try {
    const pdfBytes = await generateCarouselPDF(slides, parsed.data.coverSlide);
    const { accessToken, account: freshAccount } = await getFreshLinkedInAccount(linkedinAccount);

    if (!freshAccount.accountId) {
      throw new Error("LinkedIn author ID is missing");
    }

    const title = slides[0]?.headline || "Quill carousel";
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
                  text: slides[0]?.body || "Created with Quill",
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

    return NextResponse.json({ success: true, postUrn });
  } catch (error) {
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "failed",
        errorLog: error instanceof Error ? error.message : "Carousel publishing failed",
      },
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Carousel publishing failed",
      },
      { status: 400 }
    );
  }
}
