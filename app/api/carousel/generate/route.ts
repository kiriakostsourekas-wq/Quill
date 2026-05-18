import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import {
  MAX_CAROUSEL_BODY,
  MAX_CAROUSEL_HEADLINE,
  MAX_CAROUSEL_SLIDES,
  MAX_CAROUSEL_TITLE,
  MIN_CAROUSEL_SLIDES,
  type CarouselSlide,
} from "@/lib/carousel";
import { requireRequestUser } from "@/lib/auth";
import { groq } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { parseJsonObject, readRequestJson } from "@/lib/utils";
import { getVoiceProfilePromptContext } from "@/lib/voice-foundations";

export const runtime = "nodejs";

const generateCarouselSchema = z.object({
  sourceText: z.string().trim().min(1, "Draft text is required").max(6000),
  slideCount: z.coerce.number().int().min(MIN_CAROUSEL_SLIDES).max(MAX_CAROUSEL_SLIDES),
});

const modelCarouselSchema = z.object({
  title: z.string().trim().min(1),
  slides: z
    .array(
      z.object({
        headline: z.string().trim().min(1),
        body: z.string().trim().min(1),
      })
    )
    .min(MIN_CAROUSEL_SLIDES),
});

type ModelCarousel = z.infer<typeof modelCarouselSchema>;

function getMessageText(
  content: string | Array<{ type?: string; text?: string }> | null | undefined
) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((item) => item.text ?? "").join("");
  }
  return "";
}

function truncateField(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength).trim();
}

function normalizeModelCarousel(result: ModelCarousel, requestedSlideCount: number) {
  if (result.slides.length < requestedSlideCount) {
    throw new Error("Model returned too few slides");
  }

  const slides: CarouselSlide[] = result.slides.slice(0, requestedSlideCount).map((slide) => ({
    headline: truncateField(slide.headline, MAX_CAROUSEL_HEADLINE),
    body: truncateField(slide.body, MAX_CAROUSEL_BODY),
    background: "white",
    imageDataUrl: null,
  }));

  return {
    title: truncateField(result.title, MAX_CAROUSEL_TITLE),
    slides,
  };
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

  const parsed = generateCarouselSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid carousel generation payload" },
      { status: 400 }
    );
  }

  const profile = await prisma.voiceProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: "Set up your Voice DNA first" }, { status: 400 });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.65,
      max_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are Quill, a LinkedIn carousel copywriter.

Turn one draft into exactly ${parsed.data.slideCount} concise carousel slides in the user's Voice DNA.

Rules:
- Preserve the source meaning.
- Match the user's tone, rhythm, directness, and hook style without copying training wording.
- Keep each slide focused on one idea.
- headline max ${MAX_CAROUSEL_HEADLINE} characters.
- body max ${MAX_CAROUSEL_BODY} characters.
- Return ONLY valid JSON in this shape:
{
  "title": "string",
  "slides": [
    { "headline": "string", "body": "string" }
  ]
}`,
        },
        {
          role: "user",
          content: `Voice profile: ${JSON.stringify(
            getVoiceProfilePromptContext(profile, { includeSamplePosts: false })
          )}

Source draft:
${parsed.data.sourceText}`,
        },
      ],
    });

    const content = getMessageText(completion.choices[0]?.message?.content);
    const modelResult = modelCarouselSchema.parse(parseJsonObject<ModelCarousel>(content));
    const generated = normalizeModelCarousel(modelResult, parsed.data.slideCount);

    return NextResponse.json(generated);
  } catch (error) {
    console.error("Carousel generation failed", error);
    return NextResponse.json(
      { error: "Unable to generate carousel slides right now" },
      { status: 502 }
    );
  }
}
