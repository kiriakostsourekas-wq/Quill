export const MIN_CAROUSEL_SLIDES = 2;
export const DEFAULT_CAROUSEL_SLIDES = 3;
export const MAX_CAROUSEL_SLIDES = 10;
export const MAX_CAROUSEL_HEADLINE = 60;
export const MAX_CAROUSEL_BODY = 200;
export const MAX_CAROUSEL_TITLE = 120;
export const MAX_CAROUSEL_KICKER = 48;
export const MAX_CAROUSEL_EMPHASIS = 90;
export const MAX_CAROUSEL_BULLET = 90;
export const MAX_CAROUSEL_BULLETS = 5;

export const CAROUSEL_MODES = ["builder", "upload"] as const;
export type CarouselMode = (typeof CAROUSEL_MODES)[number];

export const CAROUSEL_SLIDE_ROLES = [
  "cover",
  "problem",
  "insight",
  "proof",
  "checklist",
  "quote",
  "framework",
  "cta",
] as const;
export type CarouselSlideRole = (typeof CAROUSEL_SLIDE_ROLES)[number];

export const CAROUSEL_GENERATION_STYLES = [
  "professional",
  "bold",
  "editorial",
  "tactical",
] as const;
export type CarouselGenerationStyle = (typeof CAROUSEL_GENERATION_STYLES)[number];

export const CAROUSEL_BACKGROUND_PRESETS = [
  { key: "white", label: "White", value: "#FFFFFF", dark: false },
  { key: "lightPurple", label: "Light purple", value: "#EEEDFE", dark: false },
  { key: "darkPurple", label: "Dark purple", value: "#534AB7", dark: true },
  { key: "lightGray", label: "Light gray", value: "#F5F5F5", dark: false },
  { key: "black", label: "Black", value: "#1A1A1A", dark: true },
  { key: "navy", label: "Navy", value: "#1E3A5F", dark: true },
] as const;

export type CarouselBackgroundKey = (typeof CAROUSEL_BACKGROUND_PRESETS)[number]["key"];

export const CAROUSEL_TEMPLATE_IDS = [
  "classic",
  "bold-claim",
  "executive-brief",
  "editorial-dark",
  "playbook-checklist",
  "myth-truth",
  "story-arc",
  "data-insight",
  "case-study",
  "framework",
  "minimal-premium",
] as const;
export type CarouselTemplateId = (typeof CAROUSEL_TEMPLATE_IDS)[number];

export const DEFAULT_CAROUSEL_TEMPLATE_ID: CarouselTemplateId = "classic";

export type CarouselTemplate = {
  id: CarouselTemplateId;
  name: string;
  description: string;
  recommendedFor: CarouselGenerationStyle[];
  previewRole: CarouselSlideRole;
  defaultThemeId: CarouselThemeId;
  accentStrategy:
    | "line"
    | "block"
    | "editorial"
    | "checklist"
    | "split"
    | "timeline"
    | "stat"
    | "case"
    | "diagram"
    | "minimal";
};

export const CAROUSEL_THEME_IDS = ["quill", "graphite", "evergreen", "coral"] as const;
export type CarouselThemeId = (typeof CAROUSEL_THEME_IDS)[number];

export const DEFAULT_CAROUSEL_THEME_ID: CarouselThemeId = "quill";

export type CarouselTheme = {
  id: CarouselThemeId;
  name: string;
  accent: string;
  accentSoft: string;
  ink: string;
  muted: string;
  surface: string;
  surfaceAlt: string;
  darkSurface: string;
  darkInk: string;
};

export const CAROUSEL_THEMES: CarouselTheme[] = [
  {
    id: "quill",
    name: "Quill",
    accent: "#534AB7",
    accentSoft: "#EEEDFE",
    ink: "#1A1A1A",
    muted: "#667085",
    surface: "#FFFFFF",
    surfaceAlt: "#F5F5F5",
    darkSurface: "#151827",
    darkInk: "#F8FAFC",
  },
  {
    id: "graphite",
    name: "Graphite",
    accent: "#2563EB",
    accentSoft: "#EAF2FF",
    ink: "#111827",
    muted: "#64748B",
    surface: "#FFFFFF",
    surfaceAlt: "#F3F4F6",
    darkSurface: "#111827",
    darkInk: "#F9FAFB",
  },
  {
    id: "evergreen",
    name: "Evergreen",
    accent: "#047857",
    accentSoft: "#E8F7F0",
    ink: "#14211D",
    muted: "#5D6F66",
    surface: "#FFFFFF",
    surfaceAlt: "#F2F7F4",
    darkSurface: "#10251D",
    darkInk: "#F4FBF8",
  },
  {
    id: "coral",
    name: "Coral",
    accent: "#E4572E",
    accentSoft: "#FFF0EA",
    ink: "#231F20",
    muted: "#725E58",
    surface: "#FFFFFF",
    surfaceAlt: "#FFF7F3",
    darkSurface: "#281C19",
    darkInk: "#FFF8F4",
  },
];

export const CAROUSEL_TEMPLATES: CarouselTemplate[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Simple vertical accent and readable copy blocks.",
    recommendedFor: ["professional", "tactical"],
    previewRole: "insight",
    defaultThemeId: "quill",
    accentStrategy: "line",
  },
  {
    id: "bold-claim",
    name: "Bold claim",
    description: "Large hooks, strong contrast, and decisive claims.",
    recommendedFor: ["bold"],
    previewRole: "cover",
    defaultThemeId: "graphite",
    accentStrategy: "block",
  },
  {
    id: "executive-brief",
    name: "Executive brief",
    description: "Boardroom-style summaries with crisp hierarchy.",
    recommendedFor: ["professional"],
    previewRole: "proof",
    defaultThemeId: "graphite",
    accentStrategy: "split",
  },
  {
    id: "editorial-dark",
    name: "Editorial dark",
    description: "Magazine-like dark slides for sharp POVs.",
    recommendedFor: ["editorial", "bold"],
    previewRole: "quote",
    defaultThemeId: "quill",
    accentStrategy: "editorial",
  },
  {
    id: "playbook-checklist",
    name: "Playbook checklist",
    description: "Action-oriented steps and checklist slides.",
    recommendedFor: ["tactical"],
    previewRole: "checklist",
    defaultThemeId: "evergreen",
    accentStrategy: "checklist",
  },
  {
    id: "myth-truth",
    name: "Myth / truth",
    description: "Contrast framing for misconception-led posts.",
    recommendedFor: ["bold", "editorial"],
    previewRole: "problem",
    defaultThemeId: "coral",
    accentStrategy: "split",
  },
  {
    id: "story-arc",
    name: "Story arc",
    description: "Sequential narrative slides with subtle progress cues.",
    recommendedFor: ["editorial", "professional"],
    previewRole: "insight",
    defaultThemeId: "quill",
    accentStrategy: "timeline",
  },
  {
    id: "data-insight",
    name: "Data insight",
    description: "Stat callouts and clean evidence framing.",
    recommendedFor: ["professional"],
    previewRole: "proof",
    defaultThemeId: "graphite",
    accentStrategy: "stat",
  },
  {
    id: "case-study",
    name: "Case study",
    description: "Context, action, result structure for examples.",
    recommendedFor: ["professional", "tactical"],
    previewRole: "proof",
    defaultThemeId: "evergreen",
    accentStrategy: "case",
  },
  {
    id: "framework",
    name: "Framework",
    description: "Named models, pillars, and reusable mental maps.",
    recommendedFor: ["tactical"],
    previewRole: "framework",
    defaultThemeId: "quill",
    accentStrategy: "diagram",
  },
  {
    id: "minimal-premium",
    name: "Minimal premium",
    description: "Quiet whitespace, precise type, and restrained accents.",
    recommendedFor: ["professional", "editorial"],
    previewRole: "insight",
    defaultThemeId: "graphite",
    accentStrategy: "minimal",
  },
];

export type CarouselSlide = {
  headline: string;
  body: string;
  background: CarouselBackgroundKey;
  imageDataUrl?: string | null;
  role?: CarouselSlideRole;
  kicker?: string;
  emphasis?: string;
  bullets?: string[];
};

export type CarouselTemplateVisuals = {
  background: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  dark: boolean;
};

export function getCarouselBackgroundPreset(background: CarouselBackgroundKey) {
  return (
    CAROUSEL_BACKGROUND_PRESETS.find((preset) => preset.key === background) ??
    CAROUSEL_BACKGROUND_PRESETS[0]
  );
}

export function getCarouselTemplate(templateId?: string | null) {
  return (
    CAROUSEL_TEMPLATES.find((template) => template.id === templateId) ??
    CAROUSEL_TEMPLATES[0]
  );
}

export function getCarouselTheme(themeId?: string | null) {
  return CAROUSEL_THEMES.find((theme) => theme.id === themeId) ?? CAROUSEL_THEMES[0];
}

export function normalizeCarouselTemplateId(
  templateId?: string | null
): CarouselTemplateId {
  return getCarouselTemplate(templateId).id;
}

export function normalizeCarouselThemeId(themeId?: string | null): CarouselThemeId {
  return getCarouselTheme(themeId).id;
}

export function normalizeCarouselRole(
  role?: string | null,
  fallback: CarouselSlideRole = "insight"
): CarouselSlideRole {
  return CAROUSEL_SLIDE_ROLES.includes(role as CarouselSlideRole)
    ? (role as CarouselSlideRole)
    : fallback;
}

export function normalizeCarouselGenerationStyle(
  style?: string | null
): CarouselGenerationStyle {
  return CAROUSEL_GENERATION_STYLES.includes(style as CarouselGenerationStyle)
    ? (style as CarouselGenerationStyle)
    : "professional";
}

export function getCarouselTextColor(background: CarouselBackgroundKey, hasImage = false) {
  if (hasImage) {
    return "#FFFFFF";
  }

  return getCarouselBackgroundPreset(background).dark ? "#FFFFFF" : "#1A1A1A";
}

export function createEmptySlide(): CarouselSlide {
  return {
    headline: "",
    body: "",
    background: "white",
    imageDataUrl: null,
    kicker: "",
    emphasis: "",
    bullets: [],
  };
}

export function createInitialSlides(count = DEFAULT_CAROUSEL_SLIDES): CarouselSlide[] {
  return Array.from({ length: count }, () => createEmptySlide());
}

export function normalizeCarouselSlides(
  slides: Array<{
    headline: string;
    body: string;
    background?: string | null;
    imageDataUrl?: string | null;
    role?: string | null;
    kicker?: string | null;
    emphasis?: string | null;
    bullets?: string[] | null;
  }>
): CarouselSlide[] {
  return slides.map((slide) => {
    const background = getCarouselBackgroundPreset(
      (slide.background ?? "white") as CarouselBackgroundKey
    ).key;
    const normalizedRole = slide.role ? normalizeCarouselRole(slide.role) : undefined;

    return {
      headline: slide.headline.trim(),
      body: slide.body.trim(),
      background,
      imageDataUrl: slide.imageDataUrl ?? null,
      kicker: (slide.kicker ?? "").trim().slice(0, MAX_CAROUSEL_KICKER),
      emphasis: (slide.emphasis ?? "").trim().slice(0, MAX_CAROUSEL_EMPHASIS),
      bullets: (slide.bullets ?? [])
        .map((bullet) => bullet.trim().replace(/\s+/g, " ").slice(0, MAX_CAROUSEL_BULLET))
        .filter(Boolean)
        .slice(0, MAX_CAROUSEL_BULLETS),
      ...(normalizedRole ? { role: normalizedRole } : {}),
    };
  });
}

export function buildCarouselContent(slides: CarouselSlide[]) {
  return normalizeCarouselSlides(slides)
    .map((slide) =>
      [
        slide.kicker,
        slide.headline,
        slide.emphasis,
        slide.body,
        ...(slide.bullets ?? []).map((bullet) => `- ${bullet}`),
      ]
        .filter(Boolean)
        .join("\n")
    )
    .filter(Boolean)
    .join("\n\n");
}

export function resolveCarouselSlideRole(
  slide: CarouselSlide,
  index: number,
  total: number,
  coverSlide = false
) {
  if (slide.role) return normalizeCarouselRole(slide.role);
  if (coverSlide && index === 0) return "cover";
  return "insight";
}

export function getCarouselTemplateVisuals(
  templateId: string | null | undefined,
  themeId: string | null | undefined,
  slide: CarouselSlide,
  role: CarouselSlideRole
): CarouselTemplateVisuals {
  const template = getCarouselTemplate(templateId);
  const theme = getCarouselTheme(themeId ?? template.defaultThemeId);

  if (template.id === "classic") {
    const preset = getCarouselBackgroundPreset(slide.background);
    return {
      background: preset.value,
      text: slide.imageDataUrl ? "#FFFFFF" : preset.dark ? "#FFFFFF" : theme.ink,
      muted: slide.imageDataUrl || preset.dark ? "#E2E8F0" : theme.muted,
      accent: theme.accent,
      accentSoft: theme.accentSoft,
      dark: preset.dark,
    };
  }

  const darkTemplate = template.id === "editorial-dark" || role === "quote";
  const forceDarkCover = template.id === "bold-claim" && (role === "cover" || role === "cta");
  const useDark = darkTemplate || forceDarkCover;

  let background = useDark ? theme.darkSurface : theme.surface;
  if (template.id === "playbook-checklist" || template.id === "case-study") {
    background = role === "cover" || role === "cta" ? theme.darkSurface : theme.surfaceAlt;
  } else if (template.id === "myth-truth") {
    background = role === "problem" ? theme.accentSoft : theme.surface;
  } else if (template.id === "data-insight") {
    background = role === "proof" ? theme.darkSurface : theme.surfaceAlt;
  } else if (template.id === "minimal-premium") {
    background = theme.surface;
  }

  return {
    background,
    text: useDark || background === theme.darkSurface ? theme.darkInk : theme.ink,
    muted: useDark || background === theme.darkSurface ? "#CBD5E1" : theme.muted,
    accent: theme.accent,
    accentSoft: theme.accentSoft,
    dark: useDark || background === theme.darkSurface,
  };
}
