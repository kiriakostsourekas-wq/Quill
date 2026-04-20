import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dedupeImportedVoicePosts } from "@/lib/voice-dna-import";
import { readRequestJson } from "@/lib/utils";

const importPostsSchema = z.object({
  posts: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const body = await readRequestJson<unknown>(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const parsed = importPostsSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid posts payload" },
      { status: 400 }
    );
  }

  const profile = await prisma.voiceProfile.findUnique({
    where: { userId: user.id },
    select: { samplePosts: true },
  });

  const posts = dedupeImportedVoicePosts(parsed.data.posts, profile?.samplePosts ?? []);

  return NextResponse.json({
    posts,
    total: posts.length,
  });
}
