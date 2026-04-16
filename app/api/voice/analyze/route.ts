import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { groq } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import {
  getVoiceFoundation,
  getVoiceDimensions,
  type VoiceDimensions,
  type VoiceSetupSource,
  voiceSetupSources,
} from "@/lib/voice-foundations";
import { parseJsonObject, readRequestJson } from "@/lib/utils";

const SAMPLE_MIN_LENGTH = 40;

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

      return NextResponse.json({ profile });
    }

    const normalizedSamples = (parsed.data.samplePosts ?? [])
      .map((sample) => sample.trim())
      .filter(Boolean)
      .slice(0, 5);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Analyze these writing samples and return ONLY valid JSON with concrete, observable voice patterns. Avoid shallow adjectives unless they are backed by recognizable patterns. Return: { traits: string[], dimensions: { sentenceLengthTendency: string, paragraphStyle: string, hookStyle: string, storytellingVsTeaching: string, directnessVsHedging: string, orientation: string, listUsage: string, emojiUsage: string, ctaTendency: string, confidenceStyle: string, languageStyle: string, notablePatterns: string[] }, sentenceLength: 'short'|'medium'|'long', formality: 'casual'|'neutral'|'formal', usesQuestions: boolean, usesLists: boolean, summary: string }. Make traits short pattern labels, not generic adjectives. Make the summary sound like something the user would recognize about their own writing.",
        },
        {
          role: "user",
          content: normalizedSamples.join("\n\n"),
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

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Voice analysis failed", error);
    return NextResponse.json(
      { error: "Unable to analyze your Voice DNA right now" },
      { status: 502 }
    );
  }
}
