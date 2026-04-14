import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const topicsSchema = z.object({
  topics: z.array(z.string().trim().min(1).max(32)).max(8),
});

export async function PATCH(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const parsed = topicsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid topics" },
      { status: 400 }
    );
  }

  const topics = [...new Set(parsed.data.topics.map((topic) => topic.trim()).filter(Boolean))].slice(0, 8);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { topics },
    select: { topics: true },
  });

  return NextResponse.json({ topics: updatedUser.topics });
}
