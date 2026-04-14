import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const saveIdeaSchema = z.object({
  hook: z.string().trim().min(1).max(160),
  expansion: z.string().trim().min(1).max(280),
  type: z.enum(["Opinion", "Story", "Tip", "Data", "Question"]),
});

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const parsed = saveIdeaSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid idea" },
      { status: 400 }
    );
  }

  const idea = await prisma.savedIdea.create({
    data: {
      userId: user.id,
      hook: parsed.data.hook,
      expansion: parsed.data.expansion,
      type: parsed.data.type,
    },
  });

  return NextResponse.json({ idea });
}
