import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { groq } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { getVoiceProfilePromptContext } from "@/lib/voice-foundations";
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

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "Rewrite this post to match the voice profile exactly. Pay attention to concrete habits like hook style, paragraph breaks, sentence length, directness, practical vs reflective orientation, and language density. Return only the rewritten text.",
        },
        {
          role: "user",
          content: `Voice profile: ${JSON.stringify(getVoiceProfilePromptContext(profile))}\n\nPost:\n${parsed.data.text}`,
        },
      ],
    });
  } catch (error) {
    console.error("Voice rewrite failed to start", error);
    return NextResponse.json(
      { error: "Unable to rewrite this draft right now" },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (error) {
        console.error("Voice rewrite stream failed", error);
        controller.error(error);
        return;
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
