"use client";

import Papa from "papaparse";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VoiceProfile = {
  traits: string[];
  sentenceLength?: string | null;
  formality?: string | null;
  usesQuestions: boolean;
  usesLists: boolean;
  summary?: string | null;
};

type LinkedInCsvRow = Record<string, string | undefined>;

const MIN_POST_CARDS = 3;
const MAX_POST_CARDS = 5;
const ANALYSIS_MIN_LENGTH = 50;
const progressMessages = [
  "Reading your sentence patterns...",
  "Identifying your tone markers...",
  "Building your voice profile...",
];

function makeEmptyPosts(count = MIN_POST_CARDS) {
  return Array.from({ length: count }, () => "");
}

function normalizeImportedPosts(posts: string[]) {
  const trimmed = posts.map((post) => post.trim()).filter(Boolean).slice(0, MAX_POST_CARDS);
  const targetLength = Math.max(MIN_POST_CARDS, trimmed.length);
  return [...trimmed, ...makeEmptyPosts(targetLength - trimmed.length)];
}

function getShareCommentaryKey(row: LinkedInCsvRow) {
  return Object.keys(row).find((key) => key.trim().toLowerCase() === "sharecommentary");
}

export function VoiceDnaClient() {
  const [samplePosts, setSamplePosts] = useState<string[]>(makeEmptyPosts());
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.json())
      .then((data) => {
        if (data.user?.voiceProfile) {
          setProfile(data.user.voiceProfile);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setProgressIndex((current) => (current + 1) % progressMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [loading]);

  const validPostCount = useMemo(
    () => samplePosts.filter((post) => post.trim().length > ANALYSIS_MIN_LENGTH).length,
    [samplePosts]
  );
  const canAnalyze = validPostCount >= 2;

  function updatePost(index: number, value: string) {
    setSamplePosts((current) => current.map((post, postIndex) => (postIndex === index ? value : post)));
  }

  function addPostCard() {
    setSamplePosts((current) => {
      if (current.length >= MAX_POST_CARDS) return current;
      return [...current, ""];
    });
  }

  function removePostCard(index: number) {
    setSamplePosts((current) => {
      if (current.length <= MIN_POST_CARDS) return current;
      return current.filter((_, postIndex) => postIndex !== index);
    });
  }

  async function importFromCsv(file: File) {
    Papa.parse<LinkedInCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const extracted = results.data
          .map((row) => {
            const key = getShareCommentaryKey(row);
            return key ? row[key] ?? "" : "";
          })
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, MAX_POST_CARDS);

        if (extracted.length === 0) {
          toast.error("No ShareCommentary posts found in that CSV.");
          return;
        }

        setSamplePosts(normalizeImportedPosts(extracted));
        toast.success("Imported LinkedIn posts.");
      },
      error: () => {
        toast.error("Unable to read that CSV file.");
      },
    });
  }

  async function analyzeVoice() {
    if (!canAnalyze) return;

    setLoading(true);
    setProgressIndex(0);

    try {
      const postsToAnalyze = samplePosts.map((post) => post.trim()).filter(Boolean);

      const response = await fetch("/api/voice/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samplePosts: postsToAnalyze }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to analyze voice");
      }

      const data = await response.json();
      setProfile(data.profile ?? null);
      toast.success("Voice analysis complete.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to analyze voice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Train your Voice DNA</h1>
        <p className="mt-1 text-sm text-muted">
          Add 3–5 of your best LinkedIn posts. The more authentic the samples, the more accurate
          your voice profile.
        </p>
      </div>

      <div className="quill-card p-6">
        <div className="space-y-4">
          {samplePosts.map((post, index) => (
            <div key={`voice-post-${index}`} className="rounded-xl border border-line p-4">
              <div className="flex items-start justify-between gap-4">
                <label className="text-sm font-medium text-ink">Post {index + 1}</label>
                {samplePosts.length > MIN_POST_CARDS && (
                  <button
                    type="button"
                    onClick={() => removePostCard(index)}
                    className="text-sm font-medium text-muted hover:text-brand"
                  >
                    Remove
                  </button>
                )}
              </div>
              <textarea
                value={post}
                onChange={(event) => updatePost(index, event.target.value)}
                className="quill-textarea mt-3 min-h-[160px]"
                placeholder="Paste a LinkedIn post you're proud of here..."
              />
              <div className="mt-2 text-right text-xs text-muted">{post.length} chars</div>
            </div>
          ))}
        </div>

        {samplePosts.length < MAX_POST_CARDS && (
          <button
            type="button"
            onClick={addPostCard}
            className="mt-4 text-sm font-medium text-brand hover:underline"
          >
            + Add another post
          </button>
        )}

        <div className="mt-6 rounded-xl border border-line bg-slate-50 p-4 text-sm leading-6 text-muted">
          <p className="font-medium text-ink">💡 Tips for better results:</p>
          <p className="mt-1">
            Use posts that got good engagement. Include a mix of storytelling and opinion posts.
            Avoid posts that were heavily edited by others.
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-line p-4">
          <button
            type="button"
            onClick={() => setImportOpen((current) => !current)}
            className="text-sm font-medium text-brand hover:underline"
          >
            Have a LinkedIn data export? Import posts automatically →
          </button>

          {importOpen && (
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-6 text-muted">
                Download your LinkedIn data export from LinkedIn Settings → Data Privacy → Get a
                copy of your data → Posts. Then upload the Posts.csv file here.
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void importFromCsv(file);
                  event.currentTarget.value = "";
                }}
                className="block w-full text-sm text-muted file:mr-4 file:rounded-md file:border-0 file:bg-brand-light file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand hover:file:bg-brand-light/80"
              />
            </div>
          )}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-xl border border-line bg-white px-4 py-4">
              <div className="flex items-center gap-3 text-sm font-medium text-ink">
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
                <span>Analyzing your writing style...</span>
              </div>
              <p className="mt-2 text-sm text-muted">{progressMessages[progressIndex]}</p>
            </div>
          ) : (
            <Button
              className={cn(!canAnalyze && "cursor-not-allowed opacity-60")}
              onClick={analyzeVoice}
              disabled={!canAnalyze}
            >
              Analyze my voice →
            </Button>
          )}

          {!canAnalyze && !loading && (
            <p className="mt-3 text-sm text-muted">Add at least 2 posts to analyze your voice.</p>
          )}
        </div>
      </div>

      {profile && (
        <div className="quill-card overflow-hidden">
          <div className="bg-brand px-6 py-4 text-white">
            <h2 className="text-lg font-semibold">Your Voice DNA</h2>
          </div>
          <div className="space-y-5 p-6">
            <div className="flex flex-wrap gap-2">
              {profile.traits.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand"
                >
                  {trait}
                </span>
              ))}
            </div>

            <p className="text-sm leading-6 text-muted">{profile.summary}</p>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-line p-4">
                <p className="text-muted">Sentence length</p>
                <p className="mt-1 font-medium capitalize text-ink">{profile.sentenceLength}</p>
              </div>
              <div className="rounded-lg border border-line p-4">
                <p className="text-muted">Formality level</p>
                <p className="mt-1 font-medium capitalize text-ink">{profile.formality}</p>
              </div>
              <div className="rounded-lg border border-line p-4">
                <p className="text-muted">Uses questions</p>
                <p className="mt-1 font-medium text-ink">{profile.usesQuestions ? "Yes" : "No"}</p>
              </div>
              <div className="rounded-lg border border-line p-4">
                <p className="text-muted">Uses lists</p>
                <p className="mt-1 font-medium text-ink">{profile.usesLists ? "Yes" : "No"}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSamplePosts(makeEmptyPosts())}
              className="text-sm font-medium text-brand hover:underline"
            >
              Re-train with new posts
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
