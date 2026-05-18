"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Eye,
  FileImage,
  FileText,
  GripVertical,
  ImagePlus,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildCarouselContent,
  CAROUSEL_BACKGROUND_PRESETS,
  createEmptySlide,
  createInitialSlides,
  DEFAULT_CAROUSEL_SLIDES,
  getCarouselBackgroundPreset,
  getCarouselTextColor,
  MAX_CAROUSEL_BODY,
  MAX_CAROUSEL_HEADLINE,
  MAX_CAROUSEL_SLIDES,
  MAX_CAROUSEL_TITLE,
  MIN_CAROUSEL_SLIDES,
  type CarouselMode,
  type CarouselSlide,
} from "@/lib/carousel";
import {
  base64ToPdfBytes,
  bytesToBase64,
  generateCarouselPDF,
  generatePdfFromImageDataUrls,
  getPdfPageCount,
} from "@/lib/carousel-pdf";
import { cn } from "@/lib/utils";

type VoiceScore = {
  score: number | null;
  feedback: string;
  tip: string;
  traits: string[];
};

type CarouselPostRecord = {
  id: string;
  postType?: string;
  content?: string;
  firstComment?: string | null;
  documentTitle?: string | null;
  coverSlide?: boolean;
  carouselMode?: CarouselMode | null;
  carouselDocumentBase64?: string | null;
  carouselSlides?: CarouselSlide[] | null;
};

type GeneratedCarouselResponse = {
  title?: string;
  slides?: CarouselSlide[];
  error?: string;
};

type UploadPreviewItem =
  | { kind: "image"; label: string; src: string }
  | { kind: "pdf"; label: string };

const emptyVoiceState: VoiceScore = {
  score: null,
  feedback: "Add slide copy or voice text to score voice consistency.",
  tip: "",
  traits: [],
};

const defaultFirstComment = "Full carousel below — save this for later 👇";

function ensureEditorSlides(slides?: CarouselSlide[] | null) {
  const normalized = (slides ?? []).map((slide) => ({
    headline: slide.headline ?? "",
    body: slide.body ?? "",
    background: slide.background ?? "white",
    imageDataUrl: slide.imageDataUrl ?? null,
  }));

  if (normalized.length >= DEFAULT_CAROUSEL_SLIDES) {
    return normalized.slice(0, MAX_CAROUSEL_SLIDES);
  }

  return [...normalized, ...createInitialSlides(DEFAULT_CAROUSEL_SLIDES - normalized.length)];
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function fileToBytes(file: File) {
  return file.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

function formatPreviewTitle(value: string) {
  return value.trim() || "Quill carousel";
}

function openPdfBytes(bytes: Uint8Array) {
  const safeBytes = Uint8Array.from(bytes);
  const blob = new Blob([safeBytes], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export function CarouselClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("postId");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const slideFileRefs = useRef<Array<HTMLInputElement | null>>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [mode, setMode] = useState<CarouselMode>("builder");
  const [title, setTitle] = useState("Quill carousel");
  const [slides, setSlides] = useState<CarouselSlide[]>(createInitialSlides());
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [coverSlide, setCoverSlide] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [firstComment, setFirstComment] = useState(defaultFirstComment);
  const [firstCommentOpen, setFirstCommentOpen] = useState(true);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [uploadPreviewItems, setUploadPreviewItems] = useState<UploadPreviewItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [voice, setVoice] = useState<VoiceScore>(emptyVoiceState);
  const [loadingExistingPost, setLoadingExistingPost] = useState(Boolean(postId));
  const [loadPostError, setLoadPostError] = useState<string | null>(null);
  const [generationSource, setGenerationSource] = useState("");
  const [generationSlideCount, setGenerationSlideCount] = useState(DEFAULT_CAROUSEL_SLIDES);
  const [generatingSlides, setGeneratingSlides] = useState(false);

  const scorableText = useMemo(
    () => (mode === "builder" ? buildCarouselContent(slides) : voiceText.trim()),
    [mode, slides, voiceText]
  );

  useEffect(() => {
    if (!postId) {
      setLoadingExistingPost(false);
      setLoadPostError(null);
      return;
    }

    let cancelled = false;
    setLoadingExistingPost(true);
    setLoadPostError(null);

    fetch("/api/posts")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load this carousel draft");
        }
        return data;
      })
      .then(async (data) => {
        if (cancelled) return;
        const post = (data.posts ?? []).find((item: CarouselPostRecord) => item.id === postId);
        if (!post || post.postType !== "carousel") {
          throw new Error("This carousel draft no longer exists or you no longer have access to it.");
        }

        setTitle(post.documentTitle ?? "Quill carousel");
        setMode(post.carouselMode ?? "builder");
        setCoverSlide(Boolean(post.coverSlide));
        setFirstComment(post.firstComment ?? defaultFirstComment);
        setFirstCommentOpen(Boolean(post.firstComment ?? defaultFirstComment));

        if ((post.carouselMode ?? "builder") === "builder") {
          setSlides(ensureEditorSlides(post.carouselSlides));
          setActiveSlideIndex(0);
          setVoiceText("");
          setPdfBase64(null);
          setUploadPreviewItems([]);
          return;
        }

        setSlides(createInitialSlides());
        setActiveSlideIndex(0);
        setVoiceText(post.content ?? "");
        setPdfBase64(post.carouselDocumentBase64 ?? null);
        if (post.carouselDocumentBase64) {
          const pageCount = await getPdfPageCount(base64ToPdfBytes(post.carouselDocumentBase64));
          setUploadPreviewItems(
            Array.from({ length: pageCount }, (_, index) => ({
              kind: "pdf" as const,
              label: `Page ${index + 1}`,
            }))
          );
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadPostError(
          error instanceof Error ? error.message : "Unable to load this carousel draft"
        );
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingExistingPost(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEffect(() => {
    setActiveSlideIndex((current) => Math.min(current, Math.max(slides.length - 1, 0)));
  }, [slides.length]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!scorableText.trim()) {
      setVoice(emptyVoiceState);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoadingScore(true);
        const response = await fetch("/api/voice/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: scorableText }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error ?? "Unable to score this carousel right now.");
        }
        setVoice({
          score: result.score ?? null,
          feedback: result.feedback ?? emptyVoiceState.feedback,
          tip: result.tip ?? "",
          traits: result.traits ?? [],
        });
      } catch (error) {
        setVoice({
          score: null,
          feedback:
            error instanceof Error
              ? error.message
              : "Unable to score this carousel right now.",
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
  }, [scorableText]);

  function updateSlide(index: number, updates: Partial<CarouselSlide>) {
    setSlides((current) =>
      current.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, ...updates } : slide
      )
    );
  }

  function addSlide() {
    if (slides.length >= MAX_CAROUSEL_SLIDES) return;

    setSlides((current) => {
      if (current.length >= MAX_CAROUSEL_SLIDES) return current;
      return [...current, createEmptySlide()];
    });
    setActiveSlideIndex(slides.length);
  }

  function removeSlide(index: number) {
    if (slides.length <= MIN_CAROUSEL_SLIDES) return;

    setSlides((current) => {
      if (current.length <= MIN_CAROUSEL_SLIDES) return current;
      return current.filter((_, slideIndex) => slideIndex !== index);
    });
    setActiveSlideIndex((current) => {
      const nextLastIndex = Math.max(slides.length - 2, 0);
      if (index < current) return current - 1;
      if (index === current) return Math.min(index, nextLastIndex);
      return Math.min(current, nextLastIndex);
    });
  }

  async function readUpload(filesInput: FileList | File[]) {
    const files = Array.from(filesInput);
    if (files.length === 0) return;

    const pdfFiles = files.filter((file) => file.type === "application/pdf");
    const imageFiles = files.filter((file) => file.type === "image/png" || file.type === "image/jpeg");

    if (pdfFiles.length > 1 || (pdfFiles.length === 1 && imageFiles.length > 0)) {
      toast.error("Upload either one PDF or up to 10 images.");
      return;
    }

    if (pdfFiles.length === 1) {
      const pdfBytes = await fileToBytes(pdfFiles[0]);
      const pageCount = await getPdfPageCount(pdfBytes);
      setPdfBase64(bytesToBase64(pdfBytes));
      setUploadPreviewItems(
        Array.from({ length: pageCount }, (_, index) => ({
          kind: "pdf",
          label: `Page ${index + 1}`,
        }))
      );
      toast.success("PDF ready for carousel publishing.");
      return;
    }

    if (imageFiles.length === 0) {
      toast.error("Upload a PDF or JPG/PNG images.");
      return;
    }

    const imageDataUrls = await Promise.all(imageFiles.slice(0, 10).map(fileToDataUrl));
    const pdfBytes = await generatePdfFromImageDataUrls(imageDataUrls);
    setPdfBase64(bytesToBase64(pdfBytes));
    setUploadPreviewItems(
      imageDataUrls.map((src, index) => ({
        kind: "image",
        label: `Slide ${index + 1}`,
        src,
      }))
    );
    toast.success("Images converted to a LinkedIn-ready PDF.");
  }

  async function handleModeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files) return;
    try {
      await readUpload(event.target.files);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to process uploaded file");
    } finally {
      event.target.value = "";
    }
  }

  async function handleSlideImage(index: number, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      updateSlide(index, { imageDataUrl: dataUrl });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add image");
    } finally {
      event.target.value = "";
    }
  }

  async function generateSlidesFromDraft() {
    const sourceText = generationSource.trim();
    if (!sourceText) {
      toast.error("Paste a draft first.");
      return;
    }

    setGeneratingSlides(true);
    try {
      const slideCount = Math.min(
        MAX_CAROUSEL_SLIDES,
        Math.max(MIN_CAROUSEL_SLIDES, generationSlideCount)
      );
      const response = await fetch("/api/carousel/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText, slideCount }),
      });
      const data = (await response.json().catch(() => ({}))) as GeneratedCarouselResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to generate carousel slides");
      }

      const generatedSlides = (data.slides ?? [])
        .slice(0, MAX_CAROUSEL_SLIDES)
        .map((slide) => ({
          headline: (slide.headline ?? "").slice(0, MAX_CAROUSEL_HEADLINE),
          body: (slide.body ?? "").slice(0, MAX_CAROUSEL_BODY),
          background: getCarouselBackgroundPreset(slide.background ?? "white").key,
          imageDataUrl: null,
        }))
        .filter((slide) => slide.headline.trim()) as CarouselSlide[];

      if (generatedSlides.length < MIN_CAROUSEL_SLIDES) {
        throw new Error("Generated slides were incomplete. Try a more detailed draft.");
      }

      setMode("builder");
      setTitle((data.title ?? "Quill carousel").slice(0, MAX_CAROUSEL_TITLE));
      setSlides(generatedSlides);
      setActiveSlideIndex(0);
      setVoiceText("");
      setPdfBase64(null);
      setUploadPreviewItems([]);
      toast.success("Carousel slides generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to generate carousel slides");
    } finally {
      setGeneratingSlides(false);
    }
  }

  async function saveDraft() {
    setSaving(true);
    try {
      const response = await fetch(postId ? `/api/posts/${postId}` : "/api/posts", {
        method: postId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: "carousel",
          documentTitle: formatPreviewTitle(title),
          carouselMode: mode,
          content: mode === "upload" ? voiceText.trim() : undefined,
          platforms: ["linkedin"],
          carouselSlides: mode === "builder" ? slides : undefined,
          carouselDocumentBase64: mode === "upload" ? pdfBase64 : null,
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
      if (mode === "builder") {
        const pdfBytes = await generateCarouselPDF(slides, coverSlide);
        openPdfBytes(pdfBytes);
      } else if (pdfBase64) {
        openPdfBytes(base64ToPdfBytes(pdfBase64));
      } else {
        throw new Error("Upload a PDF or images first");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to preview PDF");
    } finally {
      setPreviewing(false);
    }
  }

  async function publishCarousel() {
    setPublishing(true);
    try {
      const finalPdfBase64 =
        mode === "builder" ? bytesToBase64(await generateCarouselPDF(slides, coverSlide)) : pdfBase64;

      if (!finalPdfBase64) {
        throw new Error("Upload a PDF or images first");
      }

      const response = await fetch("/api/carousel/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postId ?? undefined,
          title: formatPreviewTitle(title),
          carouselMode: mode,
          slides: mode === "builder" ? slides : undefined,
          coverSlide,
          voiceText: mode === "upload" ? voiceText.trim() : undefined,
          pdfBase64: finalPdfBase64,
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
  const activePreviewIndex = Math.min(activeSlideIndex, Math.max(slides.length - 1, 0));
  const activePreviewSlide = slides[activePreviewIndex] ?? createEmptySlide();
  const activePreviewPreset = getCarouselBackgroundPreset(activePreviewSlide.background);
  const activePreviewTextColor = getCarouselTextColor(
    activePreviewSlide.background,
    Boolean(activePreviewSlide.imageDataUrl)
  );

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">LinkedIn Carousel Creator</h1>
        <p className="mt-1 text-sm text-muted">
          Create slide-based PDF posts and publish them directly to LinkedIn.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-slate-50 px-4 py-3 text-sm leading-6 text-muted">
        <span className="font-medium text-ink">Supported here:</span> LinkedIn PDF/document
        publishing, including PDFs built from slide images. Automatic scheduling is not available
        for carousels, and native image-only LinkedIn posts are not a separate publish format yet.
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="space-y-5">
          {loadingExistingPost ? (
            <div className="quill-card flex min-h-[260px] flex-col items-center justify-center gap-3 p-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
              <div>
                <p className="font-medium text-ink">Loading carousel draft…</p>
                <p className="mt-1 text-sm text-muted">Pulling the latest saved version before editing.</p>
              </div>
            </div>
          ) : loadPostError ? (
            <div className="quill-card rounded-xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-700">Unable to load this carousel draft</p>
                  <p className="mt-2 text-sm text-red-600">{loadPostError}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => router.push("/compose?workspace=scheduled")}
                    >
                      Back to Scheduled
                    </Button>
                    <Button onClick={() => router.replace("/carousel")}>Start fresh</Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <div className="quill-card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setMode("builder")}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  mode === "builder" ? "bg-brand text-white" : "border border-line bg-white text-muted"
                }`}
              >
                Build slides
              </button>
                <button
                  type="button"
                  onClick={() => setMode("upload")}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    mode === "upload" ? "bg-brand text-white" : "border border-line bg-white text-muted"
                  }`}
                >
                  Upload PDF or images
                </button>
              </div>

              <div className="mt-5 rounded-md border border-line bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand" />
                  <p className="text-sm font-semibold text-ink">Generate slides from draft</p>
                </div>
                <textarea
                  value={generationSource}
                  onChange={(event) => setGenerationSource(event.target.value)}
                  className="quill-textarea mt-3 min-h-[112px] bg-white"
                  placeholder="Paste a LinkedIn draft or outline..."
                />
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="w-full sm:w-28">
                    <label className="text-sm font-medium text-ink">Slides</label>
                    <input
                      type="number"
                      min={MIN_CAROUSEL_SLIDES}
                      max={MAX_CAROUSEL_SLIDES}
                      value={generationSlideCount}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        if (Number.isNaN(nextValue)) return;
                        setGenerationSlideCount(
                          Math.min(
                            MAX_CAROUSEL_SLIDES,
                            Math.max(MIN_CAROUSEL_SLIDES, nextValue)
                          )
                        );
                      }}
                      className="quill-input mt-2 bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={generateSlidesFromDraft}
                    disabled={generatingSlides || !generationSource.trim()}
                  >
                    {generatingSlides ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {generatingSlides ? "Generating..." : "Generate slides"}
                  </Button>
                </div>
              </div>

              <div className="mt-5">
              <label className="text-sm font-medium text-ink">Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value.slice(0, MAX_CAROUSEL_TITLE))}
                className="quill-input mt-2"
                placeholder="Name this carousel"
              />
              <div className="mt-2 text-right text-xs text-muted">
                {title.length} / {MAX_CAROUSEL_TITLE}
              </div>
            </div>

            {mode === "builder" ? (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={coverSlide}
                      onChange={(event) => setCoverSlide(event.target.checked)}
                      className="h-4 w-4 rounded border-line text-brand focus:ring-brand/20"
                    />
                    Cover slide
                  </label>
                  <span className="text-xs text-muted">
                    {slides.length} / {MAX_CAROUSEL_SLIDES} slides
                  </span>
                </div>

                  <div className="mt-4 grid gap-3">
                  {slides.map((slide, index) => (
                    <button
                      key={`carousel-slide-row-${index}`}
                      type="button"
                      onClick={() => setActiveSlideIndex(index)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition",
                        activePreviewIndex === index
                          ? "border-brand/40 bg-brand-light/35"
                          : "border-line bg-white hover:border-brand/20"
                      )}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-muted" />
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-ink">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          {slide.headline || `Slide ${index + 1}`}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {slide.body || "No body copy yet"}
                        </span>
                      </span>
                      {slide.imageDataUrl && <ImagePlus className="h-4 w-4 text-muted" />}
                      {activePreviewIndex === index && <Check className="h-4 w-4 text-brand" />}
                    </button>
                  ))}
                </div>

                <div className="mt-4 rounded-md border border-line bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Editing slide {activePreviewIndex + 1}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Keep each slide focused on one idea.
                      </p>
                    </div>
                    {slides.length > MIN_CAROUSEL_SLIDES && (
                      <button
                        type="button"
                        onClick={() => removeSlide(activePreviewIndex)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium text-ink">Headline</label>
                    <input
                      value={activePreviewSlide.headline}
                      onChange={(event) =>
                        updateSlide(activePreviewIndex, {
                          headline: event.target.value.slice(0, MAX_CAROUSEL_HEADLINE),
                        })
                      }
                      className="quill-input mt-2 bg-white"
                      placeholder="Slide headline..."
                    />
                    <div className="mt-2 text-right text-xs text-muted">
                      {activePreviewSlide.headline.length} / {MAX_CAROUSEL_HEADLINE}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium text-ink">Body</label>
                    <textarea
                      value={activePreviewSlide.body}
                      onChange={(event) =>
                        updateSlide(activePreviewIndex, {
                          body: event.target.value.slice(0, MAX_CAROUSEL_BODY),
                        })
                      }
                      className="quill-textarea mt-2 min-h-[120px] bg-white"
                    />
                    <div className="mt-2 text-right text-xs text-muted">
                      {activePreviewSlide.body.length} / {MAX_CAROUSEL_BODY}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium text-ink">Background</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {CAROUSEL_BACKGROUND_PRESETS.map((background) => (
                        <button
                          key={background.key}
                          type="button"
                          onClick={() => updateSlide(activePreviewIndex, { background: background.key })}
                          className={cn(
                            "h-8 w-8 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20",
                            activePreviewSlide.background === background.key
                              ? "border-brand ring-2 ring-brand/15"
                              : "border-line"
                          )}
                          style={{ backgroundColor: background.value }}
                          aria-label={`Use ${background.label} background`}
                          title={background.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <input
                      ref={(node) => {
                        slideFileRefs.current[activePreviewIndex] = node;
                      }}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(event) => {
                        void handleSlideImage(activePreviewIndex, event);
                      }}
                    />
                    <Button
                      variant="outline"
                      type="button"
                      className="gap-2"
                      onClick={() => slideFileRefs.current[activePreviewIndex]?.click()}
                    >
                      <ImagePlus className="h-4 w-4" />
                      {activePreviewSlide.imageDataUrl ? "Replace image" : "Upload image"}
                    </Button>
                    {activePreviewSlide.imageDataUrl && (
                      <button
                        type="button"
                        onClick={() => updateSlide(activePreviewIndex, { imageDataUrl: null })}
                        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                        Remove image
                      </button>
                    )}
                  </div>
                </div>

                {slides.length < MAX_CAROUSEL_SLIDES && (
                  <button
                    type="button"
                    onClick={addSlide}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                  >
                    <Plus className="h-4 w-4" />
                    Add slide
                  </button>
                )}
              </>
            ) : (
              <div className="mt-5 space-y-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={() => setDragActive(true)}
                  onDragLeave={() => setDragActive(false)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                    void readUpload(event.dataTransfer.files).catch((error) => {
                      toast.error(error instanceof Error ? error.message : "Unable to process uploaded file");
                    });
                  }}
                  className={`flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-5 py-8 text-center ${
                    dragActive ? "border-brand bg-brand-light/60" : "border-line bg-slate-50"
                  }`}
                >
                  <Upload className="h-7 w-7 text-brand" />
                  <p className="mt-3 text-sm font-medium text-ink">
                    Drop a PDF or up to 10 images here
                  </p>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
                    Upload a finished PDF from Canva or image exports. Images are combined into a LinkedIn-ready PDF automatically.
                  </p>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void handleModeUpload(event);
                  }}
                />

                {uploadPreviewItems.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {uploadPreviewItems.map((item) => (
                      <div
                        key={`${item.kind}-${item.label}`}
                        className="min-w-[112px] overflow-hidden rounded-lg border border-line bg-white"
                      >
                        {item.kind === "image" ? (
                          <div
                            className="aspect-[4/5] bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.src})` }}
                          />
                        ) : (
                            <div className="flex aspect-[4/5] items-center justify-center bg-slate-50 text-brand">
                              <FileText className="h-7 w-7" />
                            </div>
                          )}
                        <div className="border-t border-line px-2 py-1.5 text-xs font-medium text-ink">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-ink">Voice text (optional)</label>
                  <textarea
                    value={voiceText}
                    onChange={(event) => setVoiceText(event.target.value)}
                    className="quill-textarea mt-2 min-h-[112px]"
                    placeholder="Add the text content of your carousel so Quill can score it against your voice profile."
                  />
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <p>
                  <span className="font-medium text-ink">Carousel tips:</span> use a strong hook,
                  keep one idea per slide, and put links or extra context in the first comment.
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setFirstCommentOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-3 text-left"
                aria-expanded={firstCommentOpen}
                aria-controls="carousel-first-comment"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  <MessageSquare className="h-4 w-4 text-brand" />
                  First comment
                </span>
                <span className="text-xs text-muted">{firstCommentOpen ? "Hide" : "Add"}</span>
              </button>

              {firstCommentOpen && (
                <div id="carousel-first-comment" className="mt-3">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="carousel-first-comment-text" className="text-sm text-muted">
                      Optional LinkedIn first comment
                    </label>
                    <span className="text-xs text-muted">{firstComment.length} / 1250</span>
                  </div>
                  <textarea
                    id="carousel-first-comment-text"
                    value={firstComment}
                    onChange={(event) => setFirstComment(event.target.value.slice(0, 1250))}
                    className="quill-textarea mt-2 min-h-[92px]"
                    placeholder="Great place to add your link or a key takeaway..."
                  />
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div
                  className="relative h-16 w-16 shrink-0"
                  role="img"
                  aria-label={`Voice consistency score ${voice.score ?? "unscored"}`}
                >
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 120 120">
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
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-ink">
                    {voice.score ?? "--"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-ink">Voice consistency</h2>
                    <span className="text-xs text-muted">
                      {loadingScore ? "Scoring..." : "Live score"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted">{voice.feedback}</p>
                  {voice.tip && <p className="mt-1 text-sm leading-6 text-muted">{voice.tip}</p>}
                  {voice.traits.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {voice.traits.map((trait) => (
                        <span
                          key={trait}
                          className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4">
              <Button variant="outline" className="gap-2" onClick={saveDraft} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save draft"}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={previewPdf}
                disabled={previewing}
              >
                {previewing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {previewing ? "Generating..." : "Preview PDF"}
              </Button>
              <Button className="gap-2" onClick={publishCarousel} disabled={publishing}>
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {publishing ? "Publishing..." : "Publish"}
              </Button>
            </div>
          </div>
          )}
        </div>

        {!loadingExistingPost && !loadPostError && <div className="quill-card order-first p-4 xl:sticky xl:top-24 xl:order-none">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-brand" />
            <div>
              <h2 className="text-lg font-semibold text-ink">Live preview</h2>
              <p className="mt-1 text-sm text-muted">
                {mode === "builder"
                  ? "Preview how your slides will look once exported to PDF."
                  : "Review the uploaded pages before sending the carousel to LinkedIn."}
              </p>
            </div>
          </div>

          {mode === "builder" ? (
            <div className="mt-5">
              <div
                className="relative mx-auto aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-md border border-line p-5 xl:max-w-[320px]"
                style={{
                  backgroundColor: activePreviewSlide.imageDataUrl
                    ? undefined
                    : activePreviewPreset.value,
                  backgroundImage: activePreviewSlide.imageDataUrl
                    ? `url(${activePreviewSlide.imageDataUrl})`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {activePreviewSlide.imageDataUrl && <div className="absolute inset-0 bg-black/30" />}
                <div className="relative flex h-full gap-3">
                  <div className="w-1 shrink-0 rounded-full bg-brand" />
                  <div className="flex-1">
                    <p
                      style={{ color: activePreviewTextColor }}
                      className={`${
                        coverSlide && activePreviewIndex === 0
                          ? "text-2xl font-semibold leading-9"
                          : "text-lg font-semibold leading-7"
                      }`}
                    >
                      {activePreviewSlide.headline || `Slide ${activePreviewIndex + 1}`}
                    </p>
                    {!(coverSlide && activePreviewIndex === 0) && (
                      <p
                        className="mt-4 whitespace-pre-wrap text-sm leading-6"
                        style={{ color: activePreviewTextColor }}
                      >
                        {activePreviewSlide.body ||
                          "Supporting copy will appear here in the PDF preview."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {slides.map((slide, index) => (
                  <button
                    key={`preview-thumb-${index}`}
                    type="button"
                    onClick={() => setActiveSlideIndex(index)}
                    className={cn(
                      "h-2.5 w-8 rounded-full transition",
                      index === activePreviewIndex ? "bg-brand" : "bg-slate-200"
                    )}
                    aria-label={`Preview slide ${index + 1}`}
                    title={slide.headline || `Slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : uploadPreviewItems.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {uploadPreviewItems.map((item) => (
                <div
                  key={`${item.kind}-${item.label}-preview`}
                  className="overflow-hidden rounded-xl border border-line bg-white"
                >
                  {item.kind === "image" ? (
                    <div
                      className="aspect-[4/5] bg-cover bg-center"
                      style={{ backgroundImage: `url(${item.src})` }}
                    />
                  ) : (
                    <div className="flex aspect-[4/5] items-center justify-center bg-slate-50 text-brand">
                      <FileImage className="h-8 w-8" />
                    </div>
                  )}
                  <div className="border-t border-line px-3 py-2 text-sm font-medium text-ink">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-line bg-slate-50 px-6 py-10 text-center text-sm text-muted">
              Upload a PDF or a set of slide images to preview the carousel pages here.
            </div>
          )}
        </div>}
      </div>
    </section>
  );
}
