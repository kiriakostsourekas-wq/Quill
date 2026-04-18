import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { groq } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import {
  getVoiceFoundation,
  getVoiceProfileClientState,
  getVoiceDimensions,
  type VoiceDimensions,
  type VoiceSetupSource,
  voiceSetupSources,
} from "@/lib/voice-foundations";
import { parseJsonObject, readRequestJson } from "@/lib/utils";

const SAMPLE_MIN_LENGTH = 40;
const MIN_TOTAL_SIGNAL = 500;
const NEAR_DUPLICATE_SIMILARITY = 0.82;
const MIN_UNIQUE_WORD_RATIO = 0.45;

const analyzeSchema = z
  .object({
    setupSource: z.enum(voiceSetupSources),
    samplePosts: z.array(z.string()).max(5).optional(),
    foundationKey: z.string().trim().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.setupSource === "foundation") {
      if (!data.foundationKey || !getVoiceFoundation(data.foundationKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["foundationKey"],
          message: "Choose a voice foundation to continue.",
        });
      }
      return;
    }

    const substantialSamples = (data.samplePosts ?? []).filter(
      (sample) => sample.trim().length >= SAMPLE_MIN_LENGTH
    );

    if (substantialSamples.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["samplePosts"],
        message:
          data.setupSource === "linkedin_posts"
            ? "Add at least 2 substantial LinkedIn posts, or switch to pasted samples or a voice foundation."
            : "Add at least 2 substantial writing samples to analyze your voice.",
      });
    }
  });

type VoiceProfileResult = {
  traits: string[];
  dimensions: VoiceDimensions;
  sentenceLength: "short" | "medium" | "long";
  formality: "casual" | "neutral" | "formal";
  usesQuestions: boolean;
  usesLists: boolean;
  summary: string;
};

function getMessageText(content: string | Array<{ type?: string; text?: string }> | null | undefined) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => ("text" in item ? item.text ?? "" : ""))
      .join("");
  }
  return "";
}

function normalizeSample(sample: string) {
  return sample.trim().replace(/\s+/g, " ");
}

function tokenize(text: string) {
  return normalizeSample(text)
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function uniqueWordRatio(text: string) {
  const words = tokenize(text);
  if (words.length === 0) return 0;
  return new Set(words).size / words.length;
}

function jaccardSimilarity(left: string, right: string) {
  const leftSet = new Set(tokenize(left));
  const rightSet = new Set(tokenize(right));
  if (leftSet.size === 0 || rightSet.size === 0) return 0;

  let intersection = 0;
  for (const word of leftSet) {
    if (rightSet.has(word)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function stripExactDuplicates(samples: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const sample of samples) {
    const normalized = normalizeSample(sample).toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalizeSample(sample));
  }

  return unique;
}

function findNearDuplicatePair(samples: string[]) {
  for (let index = 0; index < samples.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < samples.length; otherIndex += 1) {
      if (jaccardSimilarity(samples[index], samples[otherIndex]) >= NEAR_DUPLICATE_SIMILARITY) {
        return [samples[index], samples[otherIndex]] as const;
      }
    }
  }

  return null;
}

function findLowDiversitySample(samples: string[]) {
  return samples.find((sample) => {
    const words = tokenize(sample);
    return words.length >= 12 && uniqueWordRatio(sample) < MIN_UNIQUE_WORD_RATIO;
  });
}

function buildOnboardingVoiceSeed(user: {
  userType?: string | null;
  communicationStyle?: string | null;
  contrarianBelief?: string | null;
}) {
  if (user.userType !== "beginner" && user.userType !== "builder") {
    return null;
  }

  const parts: string[] = [];
  if (user.communicationStyle) {
    parts.push(`The user describes their style as ${user.communicationStyle}.`);
  }
  if (user.contrarianBelief) {
    parts.push(`They believe: '${normalizeSample(user.contrarianBelief)}'.`);
  }

  if (parts.length === 0) {
    return null;
  }

  parts.push("Use this as additional voice signal.");
  return parts.join(" ");
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

  const parsed = analyzeSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid sample posts" },
      { status: 400 }
    );
  }

  try {
    if (parsed.data.setupSource === "foundation") {
      const foundation = getVoiceFoundation(parsed.data.foundationKey);

      if (!foundation) {
        return NextResponse.json(
          { error: "Choose a voice foundation to continue." },
          { status: 400 }
        );
      }

      const foundationTraits = [...foundation.traits];
      const foundationDimensions = getVoiceDimensions({
        foundationKey: foundation.key,
        setupSource: "foundation",
      });

      const profile = await prisma.voiceProfile.upsert({
        where: { userId: user.id },
        update: {
          setupSource: "foundation",
          foundationKey: foundation.key,
          samplePosts: [],
          traits: foundationTraits,
          dimensions: foundationDimensions,
          sentenceLength: foundation.sentenceLength,
          formality: foundation.formality,
          usesQuestions: foundation.usesQuestions,
          usesLists: foundation.usesLists,
          summary: `${foundation.summary} This is a starting foundation Quill can adapt as it learns from real writing.`,
          lastAnalyzedAt: new Date(),
        },
        create: {
          userId: user.id,
          setupSource: "foundation",
          foundationKey: foundation.key,
          samplePosts: [],
          traits: foundationTraits,
          dimensions: foundationDimensions,
          sentenceLength: foundation.sentenceLength,
          formality: foundation.formality,
          usesQuestions: foundation.usesQuestions,
          usesLists: foundation.usesLists,
          summary: `${foundation.summary} This is a starting foundation Quill can adapt as it learns from real writing.`,
        },
      });

      return NextResponse.json({ profile: getVoiceProfileClientState(profile) });
    }

    const normalizedSamples = stripExactDuplicates(
      (parsed.data.samplePosts ?? [])
        .map((sample) => normalizeSample(sample))
        .filter(Boolean)
        .slice(0, 5)
    );
    const substantialSamples = normalizedSamples.filter(
      (sample) => sample.length >= SAMPLE_MIN_LENGTH
    );
    const totalSignal = substantialSamples.reduce((sum, sample) => sum + sample.length, 0);
    const nearDuplicatePair = findNearDuplicatePair(substantialSamples);
    const lowDiversitySample = findLowDiversitySample(substantialSamples);

    if (substantialSamples.length < 2) {
      return NextResponse.json(
        {
          error:
            parsed.data.setupSource === "linkedin_posts"
              ? "Add at least 2 distinct substantial LinkedIn posts, or switch to pasted samples or a voice foundation."
              : "Add at least 2 distinct substantial writing samples to analyze your voice.",
        },
        { status: 400 }
      );
    }

    if (nearDuplicatePair) {
      return NextResponse.json(
        {
          error:
            "Your samples are too similar to each other. Add writing from different moments so Quill learns reusable patterns instead of one repeated example.",
        },
        { status: 400 }
      );
    }

    if (lowDiversitySample) {
      return NextResponse.json(
        {
          error:
            "One of the samples is too repetitive to build a reliable voice profile. Replace it with a fuller example of how you naturally write.",
        },
        { status: 400 }
      );
    }

    if (totalSignal < MIN_TOTAL_SIGNAL) {
      return NextResponse.json(
        {
          error:
            "Quill needs a bit more real writing to build a reliable profile. Add another substantial sample or use longer examples.",
        },
        { status: 400 }
      );
    }

    const onboardingVoiceSeed = buildOnboardingVoiceSeed(user);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Analyze these writing samples and return ONLY valid JSON with concrete, observable voice patterns. Avoid shallow adjectives unless they are backed by recognizable patterns. Do not quote sample wording back verbatim unless it is necessary to describe a recurring pattern. Return: { traits: string[], dimensions: { sentenceLengthTendency: string, paragraphStyle: string, hookStyle: string, storytellingVsTeaching: string, directnessVsHedging: string, orientation: string, listUsage: string, emojiUsage: string, ctaTendency: string, confidenceStyle: string, languageStyle: string, notablePatterns: string[] }, sentenceLength: 'short'|'medium'|'long', formality: 'casual'|'neutral'|'formal', usesQuestions: boolean, usesLists: boolean, summary: string }. Make traits short pattern labels, not generic adjectives. Make the summary sound like something the user would recognize about their own writing.",
        },
        {
          role: "user",
          content: onboardingVoiceSeed
            ? `${onboardingVoiceSeed}\n\nWriting samples:\n${normalizedSamples.join("\n\n")}`
            : normalizedSamples.join("\n\n"),
        },
      ],
    });

    const content = getMessageText(completion.choices[0]?.message?.content);
    const result = parseJsonObject<VoiceProfileResult>(content);

    const profile = await prisma.voiceProfile.upsert({
      where: { userId: user.id },
      update: {
        setupSource: parsed.data.setupSource as VoiceSetupSource,
        foundationKey: null,
        samplePosts: normalizedSamples,
        traits: result.traits,
        dimensions: result.dimensions,
        sentenceLength: result.sentenceLength,
        formality: result.formality,
        usesQuestions: result.usesQuestions,
        usesLists: result.usesLists,
        summary: result.summary,
        lastAnalyzedAt: new Date(),
      },
      create: {
        userId: user.id,
        setupSource: parsed.data.setupSource as VoiceSetupSource,
        foundationKey: null,
        samplePosts: normalizedSamples,
        traits: result.traits,
        dimensions: result.dimensions,
        sentenceLength: result.sentenceLength,
        formality: result.formality,
        usesQuestions: result.usesQuestions,
        usesLists: result.usesLists,
        summary: result.summary,
      },
    });

    return NextResponse.json({ profile: getVoiceProfileClientState(profile) });
  } catch (error) {
    console.error("Voice analysis failed", error);
    return NextResponse.json(
      { error: "Unable to analyze your Voice DNA right now" },
      { status: 502 }
    );
  }
}
