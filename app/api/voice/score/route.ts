import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { scoreVoiceTextForUser } from "@/lib/voice-dna";
import { readRequestJson } from "@/lib/utils";

const scoreSchema = z.object({
  text: z.string().trim().min(1),
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

  const parsed = scoreSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Text is required" },
      { status: 400 }
    );
  }

  try {
    const { profile, result } = await scoreVoiceTextForUser(user.id, parsed.data.text);

    if (!profile) {
      return NextResponse.json({
        score: null,
        toneScore: null,
        rhythmScore: null,
        wordChoiceScore: null,
        feedback: "Set up your Voice DNA first",
        tip: "",
        signaturePhrases: [],
        safeToPublish: false,
        weakestSentence: "",
        suggestions: [],
        traits: [],
        summary: null,
      });
    }

    return NextResponse.json({
      score: result?.score ?? null,
      toneScore: result?.toneScore ?? null,
      rhythmScore: result?.rhythmScore ?? null,
      wordChoiceScore: result?.wordChoiceScore ?? null,
      feedback: result?.feedback ?? "Set up your Voice DNA first",
      tip: result?.tip ?? "",
      signaturePhrases: result?.signaturePhrases ?? [],
      safeToPublish: result?.safeToPublish ?? false,
      weakestSentence: result?.weakestSentence ?? "",
      suggestions: result?.suggestions ?? [],
      traits: profile.traits.slice(0, 3),
      summary: profile.summary,
    });
  } catch (error) {
    console.error("Voice scoring failed", error);
    return NextResponse.json(
      {
        error: "Unable to score this draft right now",
      },
      { status: 502 }
    );
  }
}
