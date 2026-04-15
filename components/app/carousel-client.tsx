"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  FileImage,
  FileText,
  GripVertical,
  ImagePlus,
  LayoutTemplate,
  Loader2,
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
          setVoiceText("");
          setPdfBase64(null);
          setUploadPreviewItems([]);
          return;
        }

        setSlides(createInitialSlides());
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
          {loadingExistingPost ? (
            <div className="quill-card flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center">
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
                    <Button variant="outline" onClick={() => router.push("/scheduled")}>
                      Back to Scheduled
                    </Button>
                    <Button onClick={() => router.replace("/carousel")}>Start fresh</Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <div className="quill-card p-6">
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
                <label className="mt-4 inline-flex items-center gap-3 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={coverSlide}
                    onChange={(event) => setCoverSlide(event.target.checked)}
                    className="h-4 w-4 rounded border-line text-brand focus:ring-brand/20"
                  />
                  Cover slide
                </label>

                <div className="mt-5 space-y-4">
                  {slides.map((slide, index) => {
                    const preset = getCarouselBackgroundPreset(slide.background);
                    const isDark = preset.dark || Boolean(slide.imageDataUrl);

                    return (
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
                                  updateSlide(index, {
                                    headline: event.target.value.slice(0, MAX_CAROUSEL_HEADLINE),
                                  })
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
                                  updateSlide(index, {
                                    body: event.target.value.slice(0, MAX_CAROUSEL_BODY),
                                  })
                                }
                                className="quill-textarea mt-2 min-h-[140px]"
                              />
                              <div className="mt-2 text-right text-xs text-muted">
                                {slide.body.length} / {MAX_CAROUSEL_BODY}
                              </div>
                            </div>

                            <div className="mt-4">
                              <p className="text-sm font-medium text-ink">Background</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {CAROUSEL_BACKGROUND_PRESETS.map((background) => (
                                  <button
                                    key={background.key}
                                    type="button"
                                    onClick={() => updateSlide(index, { background: background.key })}
                                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                                      slide.background === background.key
                                        ? "border-brand text-brand"
                                        : "border-line text-muted"
                                    }`}
                                  >
                                    <span
                                      className="h-3 w-3 rounded-full border border-black/10"
                                      style={{ backgroundColor: background.value }}
                                    />
                                    {background.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <input
                                ref={(node) => {
                                  slideFileRefs.current[index] = node;
                                }}
                                type="file"
                                accept="image/png,image/jpeg"
                                className="hidden"
                                onChange={(event) => {
                                  void handleSlideImage(index, event);
                                }}
                              />
                              <Button
                                variant="outline"
                                type="button"
                                className="gap-2"
                                onClick={() => slideFileRefs.current[index]?.click()}
                              >
                                <ImagePlus className="h-4 w-4" />
                                {slide.imageDataUrl ? "Replace image" : "Upload image"}
                              </Button>
                              {slide.imageDataUrl && (
                                <button
                                  type="button"
                                  onClick={() => updateSlide(index, { imageDataUrl: null })}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-red-600"
                                >
                                  <X className="h-4 w-4" />
                                  Remove image
                                </button>
                              )}
                              <span className={`text-xs ${isDark ? "text-muted" : "text-muted"}`}>
                                {slide.imageDataUrl
                                  ? "Image background overrides the color swatch."
                                  : "Dark backgrounds switch the text to white automatically."}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
              </>
            ) : (
              <div className="mt-5 space-y-5">
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
                  className={`flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center ${
                    dragActive ? "border-brand bg-brand-light/60" : "border-line bg-slate-50"
                  }`}
                >
                  <Upload className="h-8 w-8 text-brand" />
                  <p className="mt-4 text-base font-medium text-ink">
                    Drop a PDF or up to 10 images here
                  </p>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
                    Upload a finished PDF from Canva or image exports from your design tool. If you upload images, Quill will combine them into a LinkedIn-ready PDF automatically.
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
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {uploadPreviewItems.map((item) => (
                      <div
                        key={`${item.kind}-${item.label}`}
                        className="overflow-hidden rounded-xl border border-line bg-white"
                      >
                        {item.kind === "image" ? (
                          <div
                            className="aspect-[4/5] bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.src})` }}
                          />
                        ) : (
                          <div className="flex aspect-[4/5] items-center justify-center bg-slate-50 text-brand">
                            <FileText className="h-8 w-8" />
                          </div>
                        )}
                        <div className="border-t border-line px-3 py-2 text-sm font-medium text-ink">
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
                    className="quill-textarea mt-2 min-h-[140px]"
                    placeholder="Add the text content of your carousel so Quill can score it against your voice profile."
                  />
                </div>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-line bg-slate-50 p-4 text-sm leading-6 text-muted">
              <p className="font-medium text-ink">💡 Tips for better results:</p>
              <p className="mt-1">
                Use a strong hook on slide one, keep each slide focused on one idea, and add a first comment if you want to drive clicks or add more context.
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
                    {loadingScore ? "Scoring..." : "How closely this carousel matches your voice."}
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
          )}
        </div>

        {!loadingExistingPost && !loadPostError && <div className="quill-card p-6">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-brand" />
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
            <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
              {slides.map((slide, index) => {
                const preset = getCarouselBackgroundPreset(slide.background);
                const textColor = getCarouselTextColor(slide.background, Boolean(slide.imageDataUrl));

                return (
                  <div
                    key={`preview-slide-${index}`}
                    className="relative aspect-[4/5] min-w-[180px] overflow-hidden rounded-2xl border border-line p-4"
                    style={{
                      backgroundColor: slide.imageDataUrl ? undefined : preset.value,
                      backgroundImage: slide.imageDataUrl ? `url(${slide.imageDataUrl})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {slide.imageDataUrl && <div className="absolute inset-0 bg-black/30" />}
                    <div className="relative flex h-full gap-3">
                      <div className="w-1 shrink-0 rounded-full bg-brand" />
                      <div className="flex-1">
                        <p
                          style={{ color: textColor }}
                          className={`${coverSlide && index === 0 ? "text-xl font-semibold leading-8" : "text-base font-semibold leading-6"}`}
                        >
                          {slide.headline || `Slide ${index + 1}`}
                        </p>
                        {!(coverSlide && index === 0) && (
                          <p
                            className="mt-3 whitespace-pre-wrap text-sm leading-6"
                            style={{ color: textColor }}
                          >
                            {slide.body || "Supporting copy will appear here in the PDF preview."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
