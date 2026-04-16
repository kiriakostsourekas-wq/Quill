import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { groq } from "@/lib/groq";
import { getVoiceProfilePromptContext } from "@/lib/voice-foundations";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/utils";

const generateIdeasSchema = z.object({
  topics: z.array(z.string().trim().min(1)).min(1).max(8),
});

type IdeaResult = {
  hook: string;
  expansion: string;
  type: "Opinion" | "Story" | "Tip" | "Data" | "Question";
  soundsLikeUser: boolean;
};

function getMessageText(
  content: string | Array<{ type?: string; text?: string }> | null | undefined
) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((item) => item.text ?? "").join("");
  }
  return "";
}

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const parsed = generateIdeasSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid topics" },
      { status: 400 }
    );
  }

  const voiceProfile = await prisma.voiceProfile.findUnique({
    where: { userId: user.id },
  });

  if (!voiceProfile) {
    return NextResponse.json({ error: "Set up your Voice DNA first" }, { status: 400 });
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a LinkedIn content strategist who specializes in personal brand content. Generate exactly 5 LinkedIn post ideas for someone with this voice profile: ${JSON.stringify(getVoiceProfilePromptContext(voiceProfile))}.

Their topics of interest: ${parsed.data.topics.join(", ")}.

For each idea return:
- hook: a single bold opening line (max 12 words) that stops the scroll. Make it sound EXACTLY like the voice profile — match their sentence length, formality, and style.
- expansion: one sentence expanding on the hook (max 25 words)
- type: one of Opinion | Story | Tip | Data | Question
- soundsLikeUser: boolean (true if the hook strongly matches the voice profile)

Return ONLY a valid JSON array of 5 objects with these exact fields. No other text.`,
      },
    ],
  });

  const content = getMessageText(completion.choices[0]?.message?.content);

  let ideas: IdeaResult[] = [];
  try {
    ideas = parseJsonArray<IdeaResult[]>(content)
      .map((idea) => ({
        hook: idea.hook?.trim() ?? "",
        expansion: idea.expansion?.trim() ?? "",
        type: idea.type,
        soundsLikeUser: Boolean(idea.soundsLikeUser),
      }))
      .filter(
        (idea) =>
          idea.hook &&
          idea.expansion &&
          ["Opinion", "Story", "Tip", "Data", "Question"].includes(idea.type)
      )
      .slice(0, 5);
  } catch {
    return NextResponse.json({ error: "Unable to generate ideas right now" }, { status: 502 });
  }

  if (ideas.length === 0) {
    return NextResponse.json({ error: "Unable to generate ideas right now" }, { status: 502 });
  }

  return NextResponse.json({ ideas });
}
