"use client";

import Papa from "papaparse";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn, safeJson } from "@/lib/utils";

type CsvRow = Record<string, string | undefined>;
type ImportStep = "upload" | "review" | "done";
type PersistedImportState = {
  step: ImportStep;
  posts: string[];
  currentIndex: number;
  addedCount: number;
  currentStrength: string;
  sampleCount: number;
};
type AcceptPostResponse = {
  error?: string;
  strength: string;
  sampleCount: number;
  done: boolean;
};
type ImportPostsResponse = {
  error?: string;
  posts: string[];
  total: number;
};
type RejectPostResponse = {
  error?: string;
  success: boolean;
};

type VoiceDnaImportClientProps = {
  userId: string;
  initialStrength: string;
  initialSampleCount: number;
};

function getShareCommentaryKey(row: CsvRow) {
  return Object.keys(row).find((key) => key.trim().toLowerCase() === "sharecommentary");
}

function strengthTone(strength: string) {
  if (strength === "solid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (strength === "forming") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export function VoiceDnaImportClient({
  userId,
  initialStrength,
  initialSampleCount,
}: VoiceDnaImportClientProps) {
  const storageKey = useMemo(() => `quill-voice-dna-import:${userId}`, [userId]);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<ImportStep>("upload");
  const [posts, setPosts] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [addedCount, setAddedCount] = useState(0);
  const [currentStrength, setCurrentStrength] = useState(initialStrength);
  const [sampleCount, setSampleCount] = useState(initialSampleCount);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setHydrated(true);
        return;
      }

      const saved = JSON.parse(raw) as PersistedImportState;
      if (Array.isArray(saved.posts) && saved.posts.length > 0) {
        setStep(saved.step);
        setPosts(saved.posts);
        setCurrentIndex(Math.min(saved.currentIndex, saved.posts.length));
        setAddedCount(saved.addedCount);
        setCurrentStrength(saved.currentStrength || initialStrength);
        setSampleCount(saved.sampleCount ?? initialSampleCount);
      }
    } catch {
      // ignore localStorage parse failures
    } finally {
      setHydrated(true);
    }
  }, [initialSampleCount, initialStrength, storageKey]);

  useEffect(() => {
    if (!hydrated) return;

    if (step === "upload" || posts.length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const nextState: PersistedImportState = {
      step,
      posts,
      currentIndex,
      addedCount,
      currentStrength,
      sampleCount,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(nextState));
  }, [addedCount, currentIndex, currentStrength, hydrated, posts, sampleCount, step, storageKey]);

  const currentPost = posts[currentIndex] ?? null;
  const reviewProgress = `${currentIndex} of ${posts.length} reviewed`;

  async function importPostsFromCsv(file: File) {
    setUploading(true);

    try {
      const extractedPosts = await new Promise<string[]>((resolve, reject) => {
        Papa.parse<CsvRow>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const posts = results.data
              .map((row) => {
                const key = getShareCommentaryKey(row);
                return key ? row[key] ?? "" : "";
              })
              .map((value) => value.trim())
              .filter((value) => value.length >= 100);

            resolve(posts);
          },
          error: (error) => reject(error),
        });
      });

      const response = await fetch("/api/voice-dna/import-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: extractedPosts }),
      });

      const data = await safeJson<ImportPostsResponse>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to import posts");
      }

      setPosts(data.posts);
      setCurrentIndex(0);
      setAddedCount(0);
      setStep("upload");

      if (data.total === 0) {
        toast.message("No new LinkedIn posts matched the import criteria.");
        return;
      }

      toast.success(`We found ${data.total} posts to review.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to import posts");
    } finally {
      setUploading(false);
    }
  }

  async function acceptCurrentPost() {
    if (!currentPost) return;

    setSubmitting(true);

    try {
      const response = await fetch("/api/voice-dna/accept-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText: currentPost }),
      });

      const data = await safeJson<AcceptPostResponse>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to add this post");
      }

      const nextIndex = currentIndex + 1;
      const nextAddedCount = addedCount + 1;

      setCurrentStrength(data.strength);
      setSampleCount(data.sampleCount);
      setAddedCount(nextAddedCount);
      setCurrentIndex(nextIndex);

      if (data.done || nextIndex >= posts.length) {
        setStep("done");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add this post");
    } finally {
      setSubmitting(false);
    }
  }

  async function rejectCurrentPost() {
    if (!currentPost) return;

    setSubmitting(true);

    try {
      const response = await fetch("/api/voice-dna/reject-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText: currentPost }),
      });

      const data = await safeJson<RejectPostResponse>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to skip this post");
      }

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      if (nextIndex >= posts.length) {
        setStep("done");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to skip this post");
    } finally {
      setSubmitting(false);
    }
  }

  function beginReview() {
    if (posts.length === 0) return;
    setStep("review");
  }

  function resetImportState() {
    window.localStorage.removeItem(storageKey);
    setStep("upload");
    setPosts([]);
    setCurrentIndex(0);
    setAddedCount(0);
  }

  if (!hydrated) {
    return (
      <section className="space-y-6">
        <div className="quill-card p-8">
          <div className="flex items-center gap-3 text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            Loading import flow…
          </div>
        </div>
      </section>
    );
  }

  if (step === "done") {
    return (
      <section className="space-y-6">
        <div className="quill-card px-8 py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-ink">Your Voice DNA has been updated.</h1>
          <p className="mt-3 text-base text-muted">{addedCount} posts added.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/voice-dna"
              onClick={resetImportState}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-5 text-sm font-medium text-white transition hover:bg-brand/90"
            >
              Back to Voice DNA
            </Link>
            <button
              type="button"
              onClick={resetImportState}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-line px-5 text-sm font-medium text-muted transition hover:border-brand/20 hover:text-brand"
            >
              Import another CSV
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <Link
        href="/voice-dna"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Voice DNA
      </Link>

      {step === "upload" ? (
        <div className="quill-card p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
            <UploadCloud className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-ink">Import your LinkedIn posts</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Download your LinkedIn data: Go to LinkedIn → Settings → Data Privacy → Get a copy of
            your data → select &apos;Posts&apos; → request archive → upload the Posts.csv file here
          </p>

          <div className="mt-8 space-y-4">
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void importPostsFromCsv(file);
                event.currentTarget.value = "";
              }}
              className="block w-full text-sm text-muted file:mr-4 file:rounded-xl file:border-0 file:bg-brand-light file:px-4 file:py-3 file:text-sm file:font-medium file:text-brand hover:file:bg-brand-light/80"
            />

            {posts.length > 0 && (
              <div className="rounded-2xl border border-line bg-slate-50 p-5">
                <p className="text-sm font-medium text-ink">We found {posts.length} posts to review</p>
                <Button
                  className="mt-4 h-12 rounded-xl"
                  onClick={beginReview}
                  disabled={uploading}
                >
                  Start reviewing
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink">{reviewProgress}</p>
              <p className="mt-1 text-sm text-muted">Review each post and decide whether to use it.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium capitalize",
                  strengthTone(currentStrength)
                )}
              >
                Voice DNA: {currentStrength}
              </span>
              <span className="text-sm text-muted">{sampleCount} samples</span>
            </div>
          </div>

          <div className="quill-card p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">LinkedIn post</p>
            <div className="mt-5 rounded-2xl border border-line bg-slate-50 p-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-ink">{currentPost}</p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-12 flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
                onClick={() => {
                  void acceptCurrentPost();
                }}
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving
                  </span>
                ) : (
                  "Use this post"
                )}
              </Button>
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-xl"
                onClick={() => {
                  void rejectCurrentPost();
                }}
                disabled={submitting}
              >
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
