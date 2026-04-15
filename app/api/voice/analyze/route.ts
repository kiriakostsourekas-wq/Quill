import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { groq } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { parseJsonObject, readRequestJson } from "@/lib/utils";

const analyzeSchema = z.object({
  samplePosts: z.array(z.string().trim().min(1)).min(2).max(5),
});

type VoiceProfileResult = {
  traits: string[];
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
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Analyze these social media posts and return ONLY valid JSON: { traits: string[], sentenceLength: 'short'|'medium'|'long', formality: 'casual'|'neutral'|'formal', usesQuestions: boolean, usesLists: boolean, summary: string }",
        },
        {
          role: "user",
          content: parsed.data.samplePosts.join("\n\n"),
        },
      ],
    });

    const content = getMessageText(completion.choices[0]?.message?.content);
    const result = parseJsonObject<VoiceProfileResult>(content);

    const profile = await prisma.voiceProfile.upsert({
      where: { userId: user.id },
      update: {
        samplePosts: parsed.data.samplePosts,
        traits: result.traits,
        sentenceLength: result.sentenceLength,
        formality: result.formality,
        usesQuestions: result.usesQuestions,
        usesLists: result.usesLists,
        summary: result.summary,
        lastAnalyzedAt: new Date(),
      },
      create: {
        userId: user.id,
        samplePosts: parsed.data.samplePosts,
        traits: result.traits,
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
