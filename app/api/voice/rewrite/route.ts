import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    const result = await generatePatternBasedVoiceText({
      profile,
      systemPrompt:
        "Rewrite this post so it sounds more like the voice profile. Pay attention to concrete habits like hook style, paragraph breaks, sentence length, directness, practical vs reflective orientation, and language density.",
      userPrompt: `Post:\n${parsed.data.text}`,
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
