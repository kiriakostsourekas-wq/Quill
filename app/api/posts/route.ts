import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncPostDeliveries } from "@/lib/publishing";
import { scoreVoiceTextForUser, toStoredVoiceFields } from "@/lib/voice-dna";

const platformSchema = z.enum(["linkedin", "twitter"]);
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
  content: z.string().trim().min(1, "Content is required"),
  platforms: z.array(platformSchema).min(1).max(2),
  scheduledAt: scheduledAtSchema.optional(),
  firstComment: firstCommentSchema.nullable().optional(),
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
  const { result } = await scoreVoiceTextForUser(user.id, parsed.data.content);

  const post = await prisma.post.create({
    data: {
      userId: user.id,
      content: parsed.data.content,
      firstComment,
      platforms: [...new Set(parsed.data.platforms)],
      scheduledAt,
      status,
      ...toStoredVoiceFields(result),
    },
  });

  await syncPostDeliveries(post.id, parsed.data.platforms);

  return NextResponse.json({ post });
}
