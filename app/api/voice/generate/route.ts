import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { groq } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { getVoiceProfilePromptContext } from "@/lib/voice-foundations";
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

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      stream: true,
      messages: [
        {
          role: "system",
          content: `You are Quill, a writing copilot that creates social posts in the user's exact voice.

Match their tone, sentence rhythm, formality, pacing, signature phrasing, hook style, paragraph structure, and practical vs reflective orientation closely.
Do not explain what you changed.
Do not add labels, quotation marks, or intro text.
Return only the finished post text.

${platformGuidance[parsed.data.platform]}`,
        },
        {
          role: "user",
          content: `Voice profile: ${JSON.stringify(getVoiceProfilePromptContext(profile))}\n\n${getPrompt(parsed.data.mode, parsed.data.input)}`,
        },
      ],
    });
  } catch (error) {
    console.error("Voice generation failed to start", error);
    return NextResponse.json(
      { error: "Unable to generate in your voice right now" },
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
        console.error("Voice generation stream failed", error);
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
