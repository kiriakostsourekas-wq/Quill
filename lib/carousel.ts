export const MIN_CAROUSEL_SLIDES = 2;
export const DEFAULT_CAROUSEL_SLIDES = 3;
export const MAX_CAROUSEL_SLIDES = 10;
export const MAX_CAROUSEL_HEADLINE = 60;
export const MAX_CAROUSEL_BODY = 200;
export const MAX_CAROUSEL_TITLE = 120;

export const CAROUSEL_MODES = ["builder", "upload"] as const;
export type CarouselMode = (typeof CAROUSEL_MODES)[number];

export const CAROUSEL_BACKGROUND_PRESETS = [
  { key: "white", label: "White", value: "#FFFFFF", dark: false },
  { key: "lightPurple", label: "Light purple", value: "#EEEDFE", dark: false },
  { key: "darkPurple", label: "Dark purple", value: "#534AB7", dark: true },
  { key: "lightGray", label: "Light gray", value: "#F5F5F5", dark: false },
  { key: "black", label: "Black", value: "#1A1A1A", dark: true },
  { key: "navy", label: "Navy", value: "#1E3A5F", dark: true },
] as const;

export type CarouselBackgroundKey = (typeof CAROUSEL_BACKGROUND_PRESETS)[number]["key"];

export type CarouselSlide = {
  headline: string;
  body: string;
  background: CarouselBackgroundKey;
  imageDataUrl?: string | null;
};

export function getCarouselBackgroundPreset(background: CarouselBackgroundKey) {
  return (
    CAROUSEL_BACKGROUND_PRESETS.find((preset) => preset.key === background) ??
    CAROUSEL_BACKGROUND_PRESETS[0]
  );
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
  };
}

export function createInitialSlides(count = DEFAULT_CAROUSEL_SLIDES) {
  return Array.from({ length: count }, () => createEmptySlide());
}

export function normalizeCarouselSlides(
  slides: Array<{
    headline: string;
    body: string;
    background?: string | null;
    imageDataUrl?: string | null;
  }>
) {
  return slides.map((slide) => ({
    headline: slide.headline.trim(),
    body: slide.body.trim(),
    background: (slide.background ?? "white") as CarouselBackgroundKey,
    imageDataUrl: slide.imageDataUrl ?? null,
  }));
}

export function buildCarouselContent(slides: CarouselSlide[]) {
  return normalizeCarouselSlides(slides)
    .map((slide) => [slide.headline, slide.body].filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n\n");
}
