export type CarouselSlide = {
  headline: string;
  body: string;
};

export const MIN_CAROUSEL_SLIDES = 2;
export const DEFAULT_CAROUSEL_SLIDES = 3;
export const MAX_CAROUSEL_SLIDES = 10;
export const MAX_CAROUSEL_HEADLINE = 60;
export const MAX_CAROUSEL_BODY = 200;

export function createEmptySlide(): CarouselSlide {
  return {
    headline: "",
    body: "",
  };
}

export function createInitialSlides(count = DEFAULT_CAROUSEL_SLIDES) {
  return Array.from({ length: count }, () => createEmptySlide());
}

export function normalizeCarouselSlides(slides: CarouselSlide[]) {
  return slides.map((slide) => ({
    headline: slide.headline.trim(),
    body: slide.body.trim(),
  }));
}

export function buildCarouselContent(slides: CarouselSlide[]) {
  return normalizeCarouselSlides(slides)
    .map((slide) => [slide.headline, slide.body].filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n\n");
}
