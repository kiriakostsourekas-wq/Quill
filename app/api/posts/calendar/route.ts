import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const rangeSchema = z.object({
  from: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid from date"),
  to: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid to date"),
});

export async function GET(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const parsed = rangeSchema.safeParse({
    from: request.nextUrl.searchParams.get("from"),
    to: request.nextUrl.searchParams.get("to"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid date range" },
      { status: 400 }
    );
  }

  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);

  const posts = await prisma.post.findMany({
    where: {
      userId: user.id,
      OR: [
        {
          scheduledAt: {
            gte: from,
            lte: to,
          },
        },
        {
          publishedAt: {
            gte: from,
            lte: to,
          },
        },
      ],
    },
    orderBy: [{ scheduledAt: "asc" }, { publishedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      postType: true,
      content: true,
      platforms: true,
      status: true,
      scheduledAt: true,
      publishedAt: true,
      voiceScore: true,
      firstComment: true,
      documentTitle: true,
    },
  });

  return NextResponse.json({ posts });
}
