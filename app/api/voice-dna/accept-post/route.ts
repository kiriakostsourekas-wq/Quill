import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVoiceProfileStrength } from "@/lib/voice-foundations";
import {
  buildPlaceholderVoiceProfileFields,
  normalizeImportedVoicePost,
  normalizeImportedVoicePostKey,
  pickAnalysisSamplePosts,
} from "@/lib/voice-dna-import";
import { readRequestJson, safeJson } from "@/lib/utils";

const acceptPostSchema = z.object({
  postText: z.string().trim().min(1, "Post text is required"),
});

type AnalyzeResponse = {
  error?: string;
  profile?: {
    traits?: string[];
    dimensions?: unknown;
    sentenceLength?: string | null;
    formality?: string | null;
    usesQuestions?: boolean;
    usesLists?: boolean;
    summary?: string | null;
  };
};

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const body = await readRequestJson<unknown>(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const parsed = acceptPostSchema.safeParse(body.data);
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
  const currentSamplePosts = profile?.samplePosts ?? [];
  const currentExcludedPosts = profile?.excludedPosts ?? [];
  const alreadyIncluded = currentSamplePosts.some(
    (sample) => normalizeImportedVoicePostKey(sample) === normalizeImportedVoicePostKey(postText)
  );
  const nextSamplePosts = alreadyIncluded ? currentSamplePosts : [...currentSamplePosts, postText];

  if (alreadyIncluded) {
    const strength = getVoiceProfileStrength({
      setupSource: profile?.setupSource ?? "linkedin_posts",
      samplePosts: nextSamplePosts,
    }).state;

    return NextResponse.json({
      strength,
      sampleCount: nextSamplePosts.length,
      done: strength === "solid" || nextSamplePosts.length >= 15,
    });
  }

  const analysisResponse = await fetch(new URL("/api/voice/analyze", request.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({
      setupSource: "linkedin_posts",
      samplePosts: pickAnalysisSamplePosts(nextSamplePosts),
    }),
    cache: "no-store",
  });

  const analysisData = await safeJson<AnalyzeResponse>(analysisResponse);
  const shouldUsePlaceholder = !analysisResponse.ok && nextSamplePosts.length < 2;

  if (!analysisResponse.ok && !shouldUsePlaceholder) {
    return NextResponse.json(
      { error: analysisData.error ?? "Unable to analyze imported posts right now" },
      { status: analysisResponse.status || 502 }
    );
  }

  const nextProfileData = shouldUsePlaceholder
    ? buildPlaceholderVoiceProfileFields(nextSamplePosts, currentExcludedPosts)
    : {
        setupSource: "linkedin_posts" as const,
        foundationKey: null,
        samplePosts: nextSamplePosts,
        excludedPosts: currentExcludedPosts,
        traits: analysisData.profile?.traits ?? [],
        sentenceLength: analysisData.profile?.sentenceLength ?? null,
        formality: analysisData.profile?.formality ?? null,
        usesQuestions: analysisData.profile?.usesQuestions ?? false,
        usesLists: analysisData.profile?.usesLists ?? false,
        summary: analysisData.profile?.summary ?? null,
        ...(analysisData.profile?.dimensions !== undefined && analysisData.profile?.dimensions !== null
          ? { dimensions: analysisData.profile.dimensions }
          : {}),
        lastAnalyzedAt: new Date(),
      };

  const finalProfile = await prisma.voiceProfile.upsert({
    where: { userId: user.id },
    update: nextProfileData,
    create: {
      userId: user.id,
      ...nextProfileData,
    },
  });

  const strength = getVoiceProfileStrength(finalProfile).state;
  const sampleCount = finalProfile.samplePosts.length;

  return NextResponse.json({
    strength,
    sampleCount,
    done: strength === "solid" || sampleCount >= 15,
  });
}
