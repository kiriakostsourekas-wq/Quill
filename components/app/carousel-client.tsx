"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, LayoutTemplate, Loader2, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildCarouselContent,
  createEmptySlide,
  createInitialSlides,
  DEFAULT_CAROUSEL_SLIDES,
  MAX_CAROUSEL_BODY,
  MAX_CAROUSEL_HEADLINE,
  MAX_CAROUSEL_SLIDES,
  MIN_CAROUSEL_SLIDES,
  type CarouselSlide,
} from "@/lib/carousel";
import { generateCarouselPDF } from "@/lib/carousel-pdf";

type VoiceScore = {
  score: number | null;
  feedback: string;
  tip: string;
  traits: string[];
};

type CarouselPostRecord = {
  id: string;
  postType?: string;
  firstComment?: string | null;
  coverSlide?: boolean;
  carouselSlides?: CarouselSlide[] | null;
};

const emptyVoiceState: VoiceScore = {
  score: null,
  feedback: "Start adding slide copy to score voice consistency.",
  tip: "",
  traits: [],
};

function ensureEditorSlides(slides?: CarouselSlide[] | null) {
  const normalized = (slides ?? []).map((slide) => ({
    headline: slide.headline ?? "",
    body: slide.body ?? "",
  }));

  if (normalized.length >= DEFAULT_CAROUSEL_SLIDES) {
    return normalized.slice(0, MAX_CAROUSEL_SLIDES);
  }

  return [...normalized, ...createInitialSlides(DEFAULT_CAROUSEL_SLIDES - normalized.length)];
}

export function CarouselClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("postId");
  const [slides, setSlides] = useState<CarouselSlide[]>(createInitialSlides());
  const [coverSlide, setCoverSlide] = useState(false);
  const [firstComment, setFirstComment] = useState("");
  const [firstCommentOpen, setFirstCommentOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [voice, setVoice] = useState<VoiceScore>(emptyVoiceState);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const combinedText = useMemo(() => buildCarouselContent(slides), [slides]);

  useEffect(() => {
    if (!postId) return;

    fetch("/api/posts")
      .then((response) => response.json())
      .then((data) => {
        const post = (data.posts ?? []).find((item: CarouselPostRecord) => item.id === postId);
        if (!post || post.postType !== "carousel") return;

        setSlides(ensureEditorSlides(post.carouselSlides));
        setCoverSlide(Boolean(post.coverSlide));
        setFirstComment(post.firstComment ?? "");
      })
      .catch(() => undefined);
  }, [postId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!combinedText.trim()) {
      setVoice(emptyVoiceState);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoadingScore(true);
        const response = await fetch("/api/voice/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: combinedText }),
        });
        const result = await response.json();
        setVoice({
          score: result.score ?? null,
          feedback: result.feedback ?? emptyVoiceState.feedback,
          tip: result.tip ?? "",
          traits: result.traits ?? [],
        });
      } catch {
        setVoice({
          score: null,
          feedback: "Unable to score this carousel right now.",
          tip: "",
          traits: [],
        });
      } finally {
        setLoadingScore(false);
      }
    }, 1000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [combinedText, coverSlide]);

  function updateSlide(index: number, field: keyof CarouselSlide, value: string) {
    setSlides((current) =>
      current.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, [field]: value } : slide
      )
    );
  }

  function addSlide() {
    setSlides((current) => {
      if (current.length >= MAX_CAROUSEL_SLIDES) return current;
      return [...current, createEmptySlide()];
    });
  }

  function removeSlide(index: number) {
    setSlides((current) => {
      if (current.length <= MIN_CAROUSEL_SLIDES) return current;
      return current.filter((_, slideIndex) => slideIndex !== index);
    });
  }

  async function saveDraft() {
    setSaving(true);
    try {
      const response = await fetch(postId ? `/api/posts/${postId}` : "/api/posts", {
        method: postId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: "carousel",
          platforms: ["linkedin"],
          carouselSlides: slides,
          coverSlide,
          firstComment: firstComment.trim() || null,
          status: "draft",
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save carousel draft");
      }

      if (!postId && data.post?.id) {
        router.replace(`/carousel?postId=${data.post.id}`);
      }

      toast.success("Carousel saved as draft.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save carousel draft");
    } finally {
      setSaving(false);
    }
  }

  async function previewPdf() {
    setPreviewing(true);
    try {
      const pdfBytes = await generateCarouselPDF(slides, coverSlide);
      const safeBytes = Uint8Array.from(pdfBytes);
      const blob = new Blob([safeBytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to preview PDF");
    } finally {
      setPreviewing(false);
    }
  }

  async function publishCarousel() {
    setPublishing(true);
    try {
      const response = await fetch("/api/carousel/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postId ?? undefined,
          slides,
          coverSlide,
          firstComment: firstComment.trim() || null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to publish carousel");
      }

      toast.success("Carousel published to LinkedIn.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to publish carousel");
    } finally {
      setPublishing(false);
    }
  }

  const score = voice.score ?? 0;
  const ringOffset = 339 - (339 * score) / 100;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">LinkedIn Carousel Creator</h1>
        <p className="mt-1 text-sm text-muted">
          Create slide-based PDF posts that get 3-5x more engagement.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="space-y-6">
          <div className="quill-card p-6">
            <label className="inline-flex items-center gap-3 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={coverSlide}
                onChange={(event) => setCoverSlide(event.target.checked)}
                className="h-4 w-4 rounded border-line text-brand focus:ring-brand/20"
              />
              Cover slide
            </label>

            <div className="mt-5 space-y-4">
              {slides.map((slide, index) => (
                <div key={`carousel-slide-${index}`} className="rounded-xl border border-line p-4">
                  <div className="flex items-start gap-3">
                    <div className="pt-1 text-muted">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-ink">Slide {index + 1}</span>
                        </div>

                        {slides.length > MIN_CAROUSEL_SLIDES && (
                          <button
                            type="button"
                            onClick={() => removeSlide(index)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove slide
                          </button>
                        )}
                      </div>

                      <div className="mt-4">
                        <label className="text-sm font-medium text-ink">Headline</label>
                        <input
                          value={slide.headline}
                          onChange={(event) =>
                            updateSlide(
                              index,
                              "headline",
                              event.target.value.slice(0, MAX_CAROUSEL_HEADLINE)
                            )
                          }
                          className="quill-input mt-2"
                          placeholder="Slide headline..."
                        />
                        <div className="mt-2 text-right text-xs text-muted">
                          {slide.headline.length} / {MAX_CAROUSEL_HEADLINE}
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="text-sm font-medium text-ink">Body</label>
                        <textarea
                          value={slide.body}
                          onChange={(event) =>
                            updateSlide(
                              index,
                              "body",
                              event.target.value.slice(0, MAX_CAROUSEL_BODY)
                            )
                          }
                          className="quill-textarea mt-2 min-h-[140px]"
                        />
                        <div className="mt-2 text-right text-xs text-muted">
                          {slide.body.length} / {MAX_CAROUSEL_BODY}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {slides.length < MAX_CAROUSEL_SLIDES && (
              <button
                type="button"
                onClick={addSlide}
                className="mt-4 text-sm font-medium text-brand hover:underline"
              >
                + Add slide
              </button>
            )}

            <div className="mt-6 rounded-xl border border-line bg-slate-50 p-4 text-sm leading-6 text-muted">
              <p className="font-medium text-ink">💡 Tips for better results:</p>
              <p className="mt-1">
                Use posts that got good engagement. Include a mix of storytelling and opinion
                posts. Avoid posts that were heavily edited by others.
              </p>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setFirstCommentOpen((current) => !current)}
                className="text-sm font-medium text-brand hover:underline"
              >
                {firstCommentOpen ? "− Hide first comment" : "+ Add first comment"}
              </button>

              {firstCommentOpen && (
                <div className="mt-3 rounded-xl border border-line bg-slate-50 p-4">
                  <label className="block text-sm font-medium text-ink">
                    First comment (optional)
                  </label>
                  <textarea
                    value={firstComment}
                    onChange={(event) => setFirstComment(event.target.value.slice(0, 1250))}
                    className="quill-textarea mt-3 min-h-[120px] bg-white"
                    placeholder="Great place to add your link or a key takeaway..."
                  />
                </div>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-line p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Voice consistency score</h2>
                  <p className="mt-1 text-sm text-muted">
                    {loadingScore ? "Scoring..." : "How closely these slides match your voice."}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" stroke="#E5E7EB" strokeWidth="10" fill="none" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="#534AB7"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray="339"
                    strokeDashoffset={ringOffset}
                  />
                  <text
                    x="60"
                    y="66"
                    textAnchor="middle"
                    className="rotate-90 fill-[#1A1A1A] text-[22px] font-semibold"
                    transform="rotate(90 60 60)"
                  >
                    {voice.score ?? "--"}
                  </text>
                </svg>
              </div>

              {voice.traits.length > 0 ? (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {voice.traits.map((trait) => (
                      <span
                        key={trait}
                        className="rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted">{voice.feedback}</p>
                  {voice.tip && <p className="mt-2 text-sm leading-6 text-muted">{voice.tip}</p>}
                </>
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted">{voice.feedback}</p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" onClick={saveDraft} disabled={saving}>
                {saving ? "Saving..." : "Save as draft"}
              </Button>
              <Button variant="outline" onClick={previewPdf} disabled={previewing}>
                {previewing ? "Generating..." : "Preview PDF"}
              </Button>
              <Button onClick={publishCarousel} disabled={publishing}>
                {publishing ? "Publishing..." : "Publish to LinkedIn"}
              </Button>
            </div>
          </div>
        </div>

        <div className="quill-card p-6">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-brand" />
            <div>
              <h2 className="text-lg font-semibold text-ink">Live preview</h2>
              <p className="mt-1 text-sm text-muted">Preview how your slides will flow as a carousel.</p>
            </div>
          </div>

          <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
            {slides.map((slide, index) => (
              <div
                key={`preview-slide-${index}`}
                className="aspect-[4/5] min-w-[180px] rounded-2xl border border-line bg-white p-4"
              >
                <div className="flex h-full gap-3">
                  <div className="w-1 shrink-0 rounded-full bg-brand" />
                  <div className="flex-1">
                    <p
                      className={`text-ink ${coverSlide && index === 0 ? "text-xl font-semibold leading-8" : "text-base font-semibold leading-6"}`}
                    >
                      {slide.headline || `Slide ${index + 1}`}
                    </p>
                    {!(coverSlide && index === 0) && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">
                        {slide.body || "Supporting copy will appear here in the PDF preview."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
