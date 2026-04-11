import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { parseJsonObject } from "@/lib/utils";

const scoreSchema = z.object({
  text: z.string().trim().min(1),
});

type ScoreResult = {
  score: number;
  feedback: string;
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

  const parsed = scoreSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Text is required" },
      { status: 400 }
    );
  }

  const profile = await prisma.voiceProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return NextResponse.json({
      score: null,
      feedback: "Set up your Voice DNA first",
      traits: [],
      summary: null,
    });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Score this text 0-100 against this voice profile. Return ONLY valid JSON: { score: number, feedback: string }",
      },
      {
        role: "user",
        content: `Voice profile: ${JSON.stringify(profile)}\n\nText:\n${parsed.data.text}`,
      },
    ],
  });

  const content = getMessageText(completion.choices[0]?.message?.content);
  const result = parseJsonObject<ScoreResult>(content);

  return NextResponse.json({
    score: result.score,
    feedback: result.feedback,
    traits: profile.traits.slice(0, 3),
    summary: profile.summary,
  });
}

