import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRecentPerformanceFeedbackPromptContext } from "@/lib/performance-feedback";
import { generatePatternBasedVoiceText } from "@/lib/voice-dna";
import { readRequestJson } from "@/lib/utils";

export const runtime = "nodejs";

const rewriteSchema = z.object({
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

  const parsed = rewriteSchema.safeParse(body.data);
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
    return NextResponse.json(
      { error: "Set up your Voice DNA first" },
      { status: 400 }
    );
  }

  try {
    const performanceContext = await getRecentPerformanceFeedbackPromptContext(user.id);
    const performanceGuidance = performanceContext
      ? ` Recent manual performance feedback:\n${performanceContext}\nUse these signals directionally when improving hooks, structure, specificity, and endings. Do not mention the metrics or feedback notes in the post.`
      : "";
    const result = await generatePatternBasedVoiceText({
      profile,
      systemPrompt: `Rewrite this post once so it sounds more like the voice profile, but do not chase a perfect match.

Hard constraints:
- Preserve the original meaning.
- Do not add new claims, examples, stories, or advice.
- Do not make the draft longer; keep the final draft within roughly 90-105% of the original length.
- Keep the paragraph structure unless it is clearly hurting readability.
- Improve hook style, sentence rhythm, directness, and language density only where it helps.
- Return only the revised post text.${performanceGuidance}`,
      userPrompt: `Original length: ${parsed.data.text.length} characters.

Post:
${parsed.data.text}`,
    });
    return new Response(result.text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Voice rewrite failed", error);
    return NextResponse.json(
      { error: "Unable to rewrite this draft right now" },
      { status: 502 }
    );
  }
}
