import { describe, expect, it } from "vitest";
import {
  CAROUSEL_TEMPLATES,
  DEFAULT_CAROUSEL_TEMPLATE_ID,
  DEFAULT_CAROUSEL_THEME_ID,
  buildCarouselContent,
  createInitialSlides,
  getCarouselTemplateVisuals,
  normalizeCarouselSlides,
  normalizeCarouselTemplateId,
  normalizeCarouselThemeId,
} from "@/lib/carousel";
import { generateCarouselPDF } from "@/lib/carousel-pdf";

describe("carousel templates", () => {
  it("keeps classic as the backward-compatible default", () => {
    expect(CAROUSEL_TEMPLATES[0].id).toBe(DEFAULT_CAROUSEL_TEMPLATE_ID);
    expect(normalizeCarouselTemplateId(null)).toBe("classic");
    expect(normalizeCarouselThemeId(null)).toBe(DEFAULT_CAROUSEL_THEME_ID);
  });

  it("normalizes legacy slides into structured slide data", () => {
    const slides = normalizeCarouselSlides([
      { headline: "Hook", body: "First point.", background: "white" },
      { headline: "Close", body: "Final point.", background: "white" },
    ]);

    expect(slides).toEqual([
      {
        headline: "Hook",
        body: "First point.",
        background: "white",
        imageDataUrl: null,
        kicker: "",
        emphasis: "",
        bullets: [],
      },
      {
        headline: "Close",
        body: "Final point.",
        background: "white",
        imageDataUrl: null,
        kicker: "",
        emphasis: "",
        bullets: [],
      },
    ]);
  });

  it("includes richer fields in the scorable carousel content", () => {
    const content = buildCarouselContent([
      {
        headline: "One clear operating rule",
        body: "Make the next action obvious.",
        background: "white",
        role: "checklist",
        kicker: "Playbook",
        emphasis: "Less guessing",
        bullets: ["Name the owner", "Define done"],
      },
    ]);

    expect(content).toContain("Playbook");
    expect(content).toContain("Less guessing");
    expect(content).toContain("- Name the owner");
  });

  it("gives non-classic templates distinct preview visuals", () => {
    const slide = createInitialSlides(1)[0];
    const classic = getCarouselTemplateVisuals("classic", "quill", slide, "cover");
    const dark = getCarouselTemplateVisuals("editorial-dark", "quill", slide, "quote");

    expect(classic.background).not.toBe(dark.background);
    expect(dark.dark).toBe(true);
  });

  it("generates non-empty PDFs for every carousel template", async () => {
    const slides = [
      {
        role: "cover" as const,
        kicker: "Framework",
        headline: "Make the next action obvious",
        body: "A useful system reduces interpretation without removing judgment.",
        background: "white" as const,
        imageDataUrl: null,
      },
      {
        role: "checklist" as const,
        headline: "Use three defaults",
        body: "Keep the operating system light enough to survive real work.",
        bullets: ["Owner", "Definition of done", "Next decision"],
        background: "white" as const,
        imageDataUrl: null,
      },
    ];

    for (const template of CAROUSEL_TEMPLATES) {
      const pdf = await generateCarouselPDF(slides, false, template.id, template.defaultThemeId);
      expect(pdf.byteLength).toBeGreaterThan(1000);
    }
  });
});
