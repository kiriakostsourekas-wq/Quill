import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildPlaceholderVoiceProfileFields,
  normalizeImportedVoicePost,
  normalizeImportedVoicePostKey,
} from "@/lib/voice-dna-import";
import { readRequestJson } from "@/lib/utils";

const rejectPostSchema = z.object({
  postText: z.string().trim().min(1, "Post text is required"),
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

  const parsed = rejectPostSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid post text" },
      { status: 400 }
    );
  }

  const postText = normalizeImportedVoicePost(parsed.data.postText);
  const profile = await prisma.voiceProfile.findUnique({
    where: { userId: user.id },
  });
  const currentExcludedPosts = profile?.excludedPosts ?? [];
  const alreadyExcluded = currentExcludedPosts.some(
    (post) => normalizeImportedVoicePostKey(post) === normalizeImportedVoicePostKey(postText)
  );

  if (alreadyExcluded) {
    return NextResponse.json({ success: true });
  }

  if (!profile) {
    await prisma.voiceProfile.create({
      data: {
        userId: user.id,
        ...buildPlaceholderVoiceProfileFields([], [postText]),
      },
    });

    return NextResponse.json({ success: true });
  }

  await prisma.voiceProfile.update({
    where: { userId: user.id },
    data: {
      excludedPosts: [...currentExcludedPosts, postText],
    },
  });

  return NextResponse.json({ success: true });
}
