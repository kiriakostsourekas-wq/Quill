import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readRequestJson } from "@/lib/utils";

const MAX_COUNT_VALUE = 1_000_000_000;
const OUTCOMES = ["underperformed", "expected", "outperformed"] as const;

const optionalMetricSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_COUNT_VALUE)
  .nullable()
  .optional();

const performanceFeedbackSchema = z.object({
  postId: z.string().trim().min(1),
  outcome: z.enum(OUTCOMES),
  likes: optionalMetricSchema,
  comments: optionalMetricSchema,
  reposts: optionalMetricSchema,
  impressions: optionalMetricSchema,
  notes: z.string().trim().max(1000, "Notes must be 1000 characters or less").nullable().optional(),
});

function normalizeMetric(value: number | null | undefined) {
  return value ?? null;
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

  const parsed = performanceFeedbackSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid performance feedback" },
      { status: 400 }
    );
  }

  const post = await prisma.post.findFirst({
    where: {
      id: parsed.data.postId,
      userId: user.id,
    },
    select: {
      id: true,
      status: true,
      deliveries: {
        where: { status: "published" },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.status !== "published" && post.deliveries.length === 0) {
    return NextResponse.json(
      { error: "Performance can only be logged for published posts" },
      { status: 409 }
    );
  }

  const feedback = await prisma.postPerformanceFeedback.upsert({
    where: { postId: post.id },
    update: {
      outcome: parsed.data.outcome,
      likes: normalizeMetric(parsed.data.likes),
      comments: normalizeMetric(parsed.data.comments),
      reposts: normalizeMetric(parsed.data.reposts),
      impressions: normalizeMetric(parsed.data.impressions),
      notes: parsed.data.notes?.trim() || null,
    },
    create: {
      postId: post.id,
      userId: user.id,
      outcome: parsed.data.outcome,
      likes: normalizeMetric(parsed.data.likes),
      comments: normalizeMetric(parsed.data.comments),
      reposts: normalizeMetric(parsed.data.reposts),
      impressions: normalizeMetric(parsed.data.impressions),
      notes: parsed.data.notes?.trim() || null,
    },
    select: {
      id: true,
      postId: true,
      outcome: true,
      likes: true,
      comments: true,
      reposts: true,
      impressions: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ feedback });
}
