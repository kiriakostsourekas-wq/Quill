import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { groq } from "@/lib/groq";
import { getVoiceProfilePromptContext } from "@/lib/voice-foundations";
import { prisma } from "@/lib/prisma";
import { parseJsonArray, readRequestJson } from "@/lib/utils";

const generateIdeasSchema = z.object({
  topics: z.array(z.string().trim().min(1)).max(8).optional().default([]),
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

  const body = await readRequestJson<unknown>(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const parsed = generateIdeasSchema.safeParse(body.data);
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

  const topics =
    parsed.data.topics.length > 0
      ? parsed.data.topics
      : user.mainTopic?.trim()
        ? [user.mainTopic.trim()]
        : [];

  if (topics.length === 0) {
    return NextResponse.json(
      { error: "Add at least one topic or complete onboarding first" },
      { status: 400 }
    );
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.75,
    messages: [
      {
        role: "system",
        content: `You are a LinkedIn content strategist who specializes in personal brand content. Generate exactly 5 LinkedIn post ideas for someone with this voice profile: ${JSON.stringify(
          getVoiceProfilePromptContext(voiceProfile, { includeSamplePosts: false })
        )}.

Their topics of interest: ${topics.join(", ")}.

For each idea return:
- hook: a single bold opening line (max 12 words) that stops the scroll. Match the profile's patterns, rhythm, and tone without reusing wording from any training sample.
- expansion: one sentence expanding on the hook (max 25 words)
- type: one of Opinion | Story | Tip | Data | Question
- soundsLikeUser: boolean (true if the hook strongly matches the voice profile)

Do not reuse exact phrases from training samples.
Do not closely paraphrase sample sentences.
Do not copy hooks or sentence shapes too literally.

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
