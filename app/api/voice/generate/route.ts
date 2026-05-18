import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRecentPerformanceFeedbackPromptContext } from "@/lib/performance-feedback";
import { generatePatternBasedVoiceText, scoreVoiceText } from "@/lib/voice-dna";
import { readRequestJson } from "@/lib/utils";

export const runtime = "nodejs";

const generateSchema = z.object({
  mode: z.enum(["idea", "notes"]),
  input: z.string().trim().min(1),
  platform: z.enum(["linkedin", "twitter", "both"]).default("linkedin"),
});

const platformGuidance: Record<z.infer<typeof generateSchema>["platform"], string> = {
  linkedin:
    "Write for LinkedIn. Keep it structured, readable, and under 3,000 characters. Prioritize a strong hook and a credible takeaway.",
  twitter:
    "Write for X. Keep it concise and sharp. Stay within 280 characters unless a short thread is clearly necessary.",
  both:
    "Write so the post works on both LinkedIn and X. Keep it concise enough for cross-posting while still feeling thoughtful and specific.",
};

function getPrompt(mode: z.infer<typeof generateSchema>["mode"], input: string) {
  if (mode === "idea") {
    return `Idea or topic:\n${input}\n\nGenerate one post in the user's voice from this starting point. Return only the finished post text.`;
  }

  return `Rough notes or bullets:\n${input}\n\nTurn these rough notes into one polished post in the user's voice. Keep the meaning intact, but make it clear, fluid, and ready to publish. Return only the finished post text.`;
}

function isBoundedPolish(original: string, polished: string) {
  const originalLength = Math.max(original.trim().length, 1);
  const polishedLength = polished.trim().length;

  return polishedLength <= Math.max(originalLength + 160, Math.round(originalLength * 1.15));
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

  const parsed = generateSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input is required" },
      { status: 400 }
    );
  }

  const profile = await prisma.voiceProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Set up your Voice DNA first" },
      { status: 400 }
    );
  }

  try {
    const performanceContext = await getRecentPerformanceFeedbackPromptContext(user.id);
    const performanceGuidance = performanceContext
      ? `\n\nRecent manual performance feedback:\n${performanceContext}\nUse these signals directionally when choosing hooks, structure, specificity, and endings. Do not mention the metrics or feedback notes in the post.`
      : "";
    const baseSystemPrompt = `You are Quill, a writing copilot that creates social posts in the user's voice.

Match tone, sentence rhythm, formality, hook style, paragraph structure, and practical vs reflective orientation.
Do not explain what you changed.
Do not add labels, quotation marks, or intro text.
Do not chase a 100% voice match; the goal is fresh writing that is similar enough to publish.

${platformGuidance[parsed.data.platform]}${performanceGuidance}`;
    const userPrompt = getPrompt(parsed.data.mode, parsed.data.input);
    const firstResult = await generatePatternBasedVoiceText({
      profile,
      systemPrompt: baseSystemPrompt,
      userPrompt,
    });
    const firstScore = await scoreVoiceText(profile, firstResult.text);
    let finalText = firstResult.text;

    if (!firstScore.safeToPublish) {
      const polishedResult = await generatePatternBasedVoiceText({
        profile,
        systemPrompt: `${baseSystemPrompt}

Make one internal polish pass on the current draft. Do not expand it. Do not add new ideas. Keep the result within roughly the same length. Stop once it is similar enough to publish; do not chase perfection.`,
        userPrompt: `${userPrompt}

Current draft:
${firstResult.text}`,
      });
      const polishedScore = await scoreVoiceText(profile, polishedResult.text);

      if (
        isBoundedPolish(firstResult.text, polishedResult.text) &&
        polishedScore.score >= firstScore.score
      ) {
        finalText = polishedResult.text;
      }
    }

    return new Response(finalText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Voice generation failed", error);
    return NextResponse.json(
      { error: "Unable to generate in your voice right now" },
      { status: 502 }
    );
  }
}
