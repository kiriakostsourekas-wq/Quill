import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { scoreVoiceTextForUser } from "@/lib/voice-dna";

const scoreSchema = z.object({
  text: z.string().trim().min(1),
});

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

  const { profile, result } = await scoreVoiceTextForUser(user.id, parsed.data.text);

  if (!profile) {
    return NextResponse.json({
      score: null,
      feedback: "Set up your Voice DNA first",
      tip: "",
      weakestSentence: "",
      suggestions: [],
      traits: [],
      summary: null,
    });
  }

  return NextResponse.json({
    score: result?.score ?? null,
    feedback: result?.feedback ?? "Set up your Voice DNA first",
    tip: result?.tip ?? "",
    weakestSentence: result?.weakestSentence ?? "",
    suggestions: result?.suggestions ?? [],
    traits: profile.traits.slice(0, 3),
    summary: profile.summary,
  });
}
