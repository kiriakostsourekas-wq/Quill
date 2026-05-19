import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import {
  CAROUSEL_GENERATION_STYLES,
  CAROUSEL_SLIDE_ROLES,
  CAROUSEL_TEMPLATE_IDS,
  MAX_CAROUSEL_BODY,
  MAX_CAROUSEL_BULLET,
  MAX_CAROUSEL_BULLETS,
  MAX_CAROUSEL_EMPHASIS,
  MAX_CAROUSEL_HEADLINE,
  MAX_CAROUSEL_KICKER,
  MAX_CAROUSEL_SLIDES,
  MAX_CAROUSEL_TITLE,
  MIN_CAROUSEL_SLIDES,
  getCarouselTemplate,
  normalizeCarouselGenerationStyle,
  normalizeCarouselRole,
  normalizeCarouselSlides,
  normalizeCarouselTemplateId,
  type CarouselSlide,
} from "@/lib/carousel";
import { requireRequestUser } from "@/lib/auth";
import { groq } from "@/lib/groq";
import { getRecentPerformanceFeedbackPromptContext } from "@/lib/performance-feedback";
import { prisma } from "@/lib/prisma";
import { parseJsonObject, readRequestJson } from "@/lib/utils";
import { getVoiceProfilePromptContext } from "@/lib/voice-foundations";

export const runtime = "nodejs";

const generateCarouselSchema = z.object({
  sourceText: z.string().trim().min(1, "Draft text is required").max(6000),
  slideCount: z.coerce.number().int().min(MIN_CAROUSEL_SLIDES).max(MAX_CAROUSEL_SLIDES),
  style: z.enum(CAROUSEL_GENERATION_STYLES).optional(),
  templateId: z.enum(CAROUSEL_TEMPLATE_IDS).optional(),
});

const modelCarouselSchema = z.object({
  title: z.string().trim().min(1),
  recommendedTemplateId: z.enum(CAROUSEL_TEMPLATE_IDS).optional(),
  firstComment: z.string().trim().max(1250).optional(),
  slides: z
    .array(
      z.object({
        role: z.enum(CAROUSEL_SLIDE_ROLES).optional(),
        kicker: z.string().trim().optional(),
        headline: z.string().trim().min(1),
        body: z.string().trim().optional(),
        emphasis: z.string().trim().optional(),
        bullets: z.array(z.string().trim()).optional(),
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

function normalizeModelCarousel(
  result: ModelCarousel,
  requestedSlideCount: number,
  requestedTemplateId?: string
) {
  if (result.slides.length < requestedSlideCount) {
    throw new Error("Model returned too few slides");
  }

  const slides: CarouselSlide[] = normalizeCarouselSlides(
    result.slides.slice(0, requestedSlideCount).map((slide, index) => ({
      headline: truncateField(slide.headline, MAX_CAROUSEL_HEADLINE),
      body: truncateField(slide.body ?? "", MAX_CAROUSEL_BODY),
      background: "white",
      imageDataUrl: null,
      role: normalizeCarouselRole(
        slide.role,
        index === 0 ? "cover" : index === requestedSlideCount - 1 ? "cta" : "insight"
      ),
      kicker: truncateField(slide.kicker ?? "", MAX_CAROUSEL_KICKER),
      emphasis: truncateField(slide.emphasis ?? "", MAX_CAROUSEL_EMPHASIS),
      bullets: (slide.bullets ?? [])
        .map((bullet) => truncateField(bullet, MAX_CAROUSEL_BULLET))
        .filter(Boolean)
        .slice(0, MAX_CAROUSEL_BULLETS),
    }))
  );
  const recommendedTemplateId = normalizeCarouselTemplateId(
    result.recommendedTemplateId ?? requestedTemplateId
  );

  return {
    title: truncateField(result.title, MAX_CAROUSEL_TITLE),
    recommendedTemplateId,
    templateId: recommendedTemplateId,
    firstComment: result.firstComment ? truncateField(result.firstComment, 1250) : null,
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
    const style = normalizeCarouselGenerationStyle(parsed.data.style);
    const requestedTemplate = getCarouselTemplate(parsed.data.templateId);
    const performanceContext = await getRecentPerformanceFeedbackPromptContext(user.id);
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.65,
      max_tokens: 2400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are Quill, a LinkedIn carousel strategist and copywriter.

Turn one draft into exactly ${parsed.data.slideCount} concise LinkedIn carousel slides in the user's Voice DNA.

Rules:
- Preserve the source meaning.
- Match the user's tone, rhythm, directness, and hook style without copying training wording.
- Make each slide mobile-readable: one main idea, short lines, no dense paragraphs.
- Requested style: ${style}.
- Prefer this template when it fits: ${requestedTemplate.id} (${requestedTemplate.name}).
- Recommend a different template only if it clearly fits the draft better.
- Allowed templates: ${CAROUSEL_TEMPLATE_IDS.join(", ")}.
- Allowed roles: ${CAROUSEL_SLIDE_ROLES.join(", ")}.
- Keep each slide focused on one idea.
- headline max ${MAX_CAROUSEL_HEADLINE} characters.
- body max ${MAX_CAROUSEL_BODY} characters.
- kicker max ${MAX_CAROUSEL_KICKER} characters.
- emphasis max ${MAX_CAROUSEL_EMPHASIS} characters.
- bullets max ${MAX_CAROUSEL_BULLETS} items, ${MAX_CAROUSEL_BULLET} characters each.
- Return ONLY valid JSON in this shape:
{
  "title": "string",
  "recommendedTemplateId": "classic | bold-claim | executive-brief | editorial-dark | playbook-checklist | myth-truth | story-arc | data-insight | case-study | framework | minimal-premium",
  "firstComment": "optional string",
  "slides": [
    {
      "role": "cover | problem | insight | proof | checklist | quote | framework | cta",
      "kicker": "optional string",
      "headline": "string",
      "body": "optional string",
      "emphasis": "optional string",
      "bullets": ["optional bullet"]
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Voice profile: ${JSON.stringify(
            getVoiceProfilePromptContext(profile, { includeSamplePosts: false })
          )}

Recent LinkedIn performance signals:
${performanceContext ?? "No logged performance signals yet."}

Source draft:
${parsed.data.sourceText}`,
        },
      ],
    });

    const content = getMessageText(completion.choices[0]?.message?.content);
    const modelResult = modelCarouselSchema.parse(parseJsonObject<ModelCarousel>(content));
    const generated = normalizeModelCarousel(
      modelResult,
      parsed.data.slideCount,
      requestedTemplate.id
    );

    return NextResponse.json(generated);
  } catch (error) {
    console.error(
      "Carousel generation failed",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Unable to generate carousel slides right now" },
      { status: 502 }
    );
  }
}
