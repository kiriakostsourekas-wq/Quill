"use client";

import Papa from "papaparse";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getVoiceFoundation,
  getVoiceDimensions,
  getVoiceProfileStrength,
  getVoiceSetupSourceLabel,
  type VoiceProfileSampleSignal,
  voiceDimensionLabels,
  voiceFoundations,
  type VoiceDimensions,
  type VoiceFoundationKey,
  type VoiceSetupSource,
} from "@/lib/voice-foundations";

type VoiceProfile = {
  setupSource: VoiceSetupSource;
  foundationKey?: string | null;
  traits: string[];
  dimensions?: VoiceDimensions | null;
  sampleSignal?: Partial<VoiceProfileSampleSignal> | null;
  sentenceLength?: string | null;
  formality?: string | null;
  usesQuestions: boolean;
  usesLists: boolean;
  summary?: string | null;
};

type LinkedInCsvRow = Record<string, string | undefined>;
type VoiceDnaViewMode = "profile" | "train";

const MIN_SAMPLE_CARDS = 3;
const MAX_SAMPLE_CARDS = 5;
const ANALYSIS_MIN_LENGTH = 40;
const progressMessages = [
  "Reading your sentence patterns...",
  "Identifying your tone markers...",
  "Building your voice profile...",
];

const setupPaths: {
  value: VoiceSetupSource;
  label: string;
  description: string;
}[] = [
  {
    value: "linkedin_posts",
    label: "Use my past LinkedIn posts",
    description: "Best when you already have a few posts that sound like you.",
  },
  {
    value: "pasted_samples",
    label: "Paste writing samples",
    description: "Use notes, tweets, essays, or anything else you personally wrote.",
  },
  {
    value: "foundation",
    label: "Start from a voice foundation",
    description: "Start with a credible baseline Quill can adapt over time.",
  },
];

function makeEmptyPosts(count = MIN_SAMPLE_CARDS) {
  return Array.from({ length: count }, () => "");
}

function normalizeImportedPosts(posts: string[]) {
  const trimmed = posts.map((post) => post.trim()).filter(Boolean).slice(0, MAX_SAMPLE_CARDS);
  const targetLength = Math.max(MIN_SAMPLE_CARDS, trimmed.length);
  return [...trimmed, ...makeEmptyPosts(targetLength - trimmed.length)];
}

function getShareCommentaryKey(row: LinkedInCsvRow) {
  return Object.keys(row).find((key) => key.trim().toLowerCase() === "sharecommentary");
}

function countSubstantialSamples(posts: string[]) {
  return posts.filter((post) => post.trim().length >= ANALYSIS_MIN_LENGTH).length;
}

function SampleEditor({
  title,
  description,
  posts,
  placeholder,
  onChange,
  onAdd,
  onRemove,
  importSection,
  footerPrompt,
}: {
  title: string;
  description: string;
  posts: string[];
  placeholder: string;
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  importSection?: ReactNode;
  footerPrompt?: ReactNode;
}) {
  return (
    <div className="quill-card p-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      </div>

      <div className="mt-5 space-y-4">
        {posts.map((post, index) => (
          <div key={`${title}-${index}`} className="rounded-xl border border-line p-4">
            <div className="flex items-start justify-between gap-4">
              <label className="text-sm font-medium text-ink">Sample {index + 1}</label>
              {posts.length > MIN_SAMPLE_CARDS && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="text-sm font-medium text-muted hover:text-brand"
                >
                  Remove
                </button>
              )}
            </div>
            <textarea
              value={post}
              onChange={(event) => onChange(index, event.target.value)}
              className="quill-textarea mt-3 min-h-[160px]"
              placeholder={placeholder}
            />
            <div className="mt-2 text-right text-xs text-muted">{post.length} chars</div>
          </div>
        ))}
      </div>

      {posts.length < MAX_SAMPLE_CARDS && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 text-sm font-medium text-brand hover:underline"
        >
          + Add another sample
        </button>
      )}

      <div className="mt-6 rounded-xl border border-line bg-slate-50 p-4 text-sm leading-6 text-muted">
        <p className="font-medium text-ink">💡 Tips for better results:</p>
        <p className="mt-1">
          Use writing that feels natural and unedited. Include a mix of storytelling, opinion, or
          explanation. The goal is to show how you actually think on the page.
        </p>
      </div>

      {importSection}
      {footerPrompt}
    </div>
  );
}

function VoiceProfileView({
  profile,
  profileStrength,
  profileDimensions,
  currentFoundationData,
  onTrainMore,
}: {
  profile: VoiceProfile;
  profileStrength: ReturnType<typeof getVoiceProfileStrength> | null;
  profileDimensions: VoiceDimensions | null;
  currentFoundationData: ReturnType<typeof getVoiceFoundation>;
  onTrainMore: () => void;
}) {
  return (
    <div className="quill-card overflow-hidden">
      <div className="bg-brand px-6 py-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold">Your Voice DNA</h1>
            <p className="mt-2 text-sm leading-6 text-white/80">
              This is Quill&apos;s current working read on how you naturally write. Use it for
              generation, refinement, and voice checks, then retrain when you want a stronger
              signal.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-white/20 bg-white text-brand hover:bg-white/90"
            onClick={onTrainMore}
          >
            Add more samples
          </Button>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {profileStrength && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                profileStrength.state === "weak"
                  ? "bg-red-50 text-red-700"
                  : profileStrength.state === "forming"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {profileStrength.label}
            </span>
          )}
          <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand">
            Started from: {getVoiceSetupSourceLabel(profile.setupSource)}
            {profile.setupSource === "foundation" && currentFoundationData
              ? ` · ${currentFoundationData.label}`
              : ""}
          </span>
          {profile.traits.slice(0, 4).map((trait) => (
            <span
              key={trait}
              className="rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand"
            >
              {trait}
            </span>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm leading-6 text-muted">{profile.summary}</p>
          {profileStrength && <p className="text-sm leading-6 text-muted">{profileStrength.note}</p>}
        </div>

        {profileDimensions && (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {(
              [
                "hookStyle",
                "paragraphStyle",
                "storytellingVsTeaching",
                "directnessVsHedging",
                "orientation",
                "languageStyle",
              ] satisfies Array<keyof VoiceDimensions>
            ).map((key) => (
              <div key={key} className="rounded-lg border border-line p-4">
                <p className="text-muted">{voiceDimensionLabels[key]}</p>
                <p className="mt-1 font-medium text-ink">{profileDimensions[key]}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-line p-4">
            <p className="text-muted">Sentence tendency</p>
            <p className="mt-1 font-medium text-ink">
              {profileDimensions?.sentenceLengthTendency ??
                (profile.sentenceLength ? `${profile.sentenceLength} overall` : "Not set")}
            </p>
          </div>
          <div className="rounded-lg border border-line p-4">
            <p className="text-muted">Confidence</p>
            <p className="mt-1 font-medium text-ink">
              {profileDimensions?.confidenceStyle ?? "Not set"}
            </p>
          </div>
          <div className="rounded-lg border border-line p-4">
            <p className="text-muted">Emoji usage</p>
            <p className="mt-1 font-medium text-ink">{profileDimensions?.emojiUsage ?? "Not set"}</p>
          </div>
          <div className="rounded-lg border border-line p-4">
            <p className="text-muted">CTA tendency</p>
            <p className="mt-1 font-medium text-ink">
              {profileDimensions?.ctaTendency ?? "Not set"}
            </p>
          </div>
        </div>

        {profileDimensions?.notablePatterns?.length ? (
          <div className="rounded-lg border border-line p-4">
            <p className="text-sm font-medium text-ink">Recognizable patterns</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
              {profileDimensions.notablePatterns.map((pattern) => (
                <li key={pattern}>• {pattern}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function VoiceDnaClient() {
  const [viewMode, setViewMode] = useState<VoiceDnaViewMode>("train");
  const [setupPath, setSetupPath] = useState<VoiceSetupSource>("linkedin_posts");
  const [linkedinPosts, setLinkedinPosts] = useState<string[]>(makeEmptyPosts());
  const [writingSamples, setWritingSamples] = useState<string[]>(makeEmptyPosts());
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Analyzing your writing style...");
  const [progressIndex, setProgressIndex] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedFoundation, setSelectedFoundation] =
    useState<VoiceFoundationKey>("clear_professional");

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.json())
      .then((data) => {
        if (data.user?.voiceProfile) {
          setProfile(data.user.voiceProfile);
          setViewMode("profile");
          setSetupPath(data.user.voiceProfile.setupSource ?? "linkedin_posts");
          if (data.user.voiceProfile.foundationKey) {
            setSelectedFoundation(data.user.voiceProfile.foundationKey);
          }
          return;
        }

        setViewMode("train");
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!loading || setupPath === "foundation") return;

    const interval = setInterval(() => {
      setProgressIndex((current) => (current + 1) % progressMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [loading, setupPath]);

  const activeSamples = setupPath === "linkedin_posts" ? linkedinPosts : writingSamples;
  const substantialSampleCount = useMemo(
    () => countSubstantialSamples(activeSamples),
    [activeSamples]
  );
  const canAnalyzeSamples = substantialSampleCount >= 2;

  function updateSamples(path: "linkedin_posts" | "pasted_samples", index: number, value: string) {
    const setter = path === "linkedin_posts" ? setLinkedinPosts : setWritingSamples;
    setter((current) => current.map((post, postIndex) => (postIndex === index ? value : post)));
  }

  function addSampleCard(path: "linkedin_posts" | "pasted_samples") {
    const setter = path === "linkedin_posts" ? setLinkedinPosts : setWritingSamples;
    setter((current) => {
      if (current.length >= MAX_SAMPLE_CARDS) return current;
      return [...current, ""];
    });
  }

  function removeSampleCard(path: "linkedin_posts" | "pasted_samples", index: number) {
    const setter = path === "linkedin_posts" ? setLinkedinPosts : setWritingSamples;
    setter((current) => {
      if (current.length <= MIN_SAMPLE_CARDS) return current;
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
          .slice(0, MAX_SAMPLE_CARDS);

        if (extracted.length === 0) {
          toast.error("No ShareCommentary posts found in that CSV.");
          return;
        }

        setLinkedinPosts(normalizeImportedPosts(extracted));
        setSetupPath("linkedin_posts");

        if (countSubstantialSamples(extracted) < 2) {
          toast.message(
            "Not enough strong LinkedIn posts yet. You can paste other writing samples or start from a voice foundation."
          );
          return;
        }

        toast.success("Imported LinkedIn posts.");
      },
      error: () => {
        toast.error("Unable to read that CSV file.");
      },
    });
  }

  async function analyzeFromSamples(source: "linkedin_posts" | "pasted_samples") {
    const samplePosts = (source === "linkedin_posts" ? linkedinPosts : writingSamples)
      .map((post) => post.trim())
      .filter(Boolean);

    setLoading(true);
    setLoadingLabel("Analyzing your writing style...");
    setProgressIndex(0);

    try {
      const response = await fetch("/api/voice/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupSource: source,
          samplePosts,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to analyze voice");
      }

      const data = await response.json();
      setProfile(data.profile ?? null);
      setSetupPath(source);
      setViewMode("profile");
      toast.success(
        source === "linkedin_posts"
          ? "Voice profile built from your LinkedIn posts."
          : "Voice profile built from your writing samples."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to analyze voice");
    } finally {
      setLoading(false);
    }
  }

  async function createFoundationProfile() {
    setLoading(true);
    setLoadingLabel("Creating your starting voice profile...");

    try {
      const response = await fetch("/api/voice/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupSource: "foundation",
          foundationKey: selectedFoundation,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to start from this foundation");
      }

      const data = await response.json();
      setProfile(data.profile ?? null);
      setSetupPath("foundation");
      setViewMode("profile");
      toast.success("Starting voice foundation created.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start from this foundation"
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedFoundationData = getVoiceFoundation(selectedFoundation);
  const currentFoundationData = getVoiceFoundation(profile?.foundationKey);
  const profileStrength = profile ? getVoiceProfileStrength(profile) : null;
  const profileDimensions = profile ? getVoiceDimensions(profile) : null;
  const showTraining = !profile || viewMode === "train";

  return (
    <section className="space-y-6">
      {!showTraining && profile ? (
        <VoiceProfileView
          profile={profile}
          profileStrength={profileStrength}
          profileDimensions={profileDimensions}
          currentFoundationData={currentFoundationData}
          onTrainMore={() => {
            setSetupPath(profile.setupSource === "foundation" ? "pasted_samples" : profile.setupSource);
            setViewMode("train");
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-ink">
                {profile ? "Add more signal to Voice DNA" : "Train your Voice DNA"}
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                Quill works best when it understands how you naturally write. Use your past
                LinkedIn posts if you have them, paste writing you already trust, or start from a
                clean foundation if you are still defining your voice. Once this is set, Compose
                can generate from ideas, rewrite rough notes, and improve drafts in your voice.
              </p>
            </div>
            {profile && (
              <Button variant="outline" onClick={() => setViewMode("profile")}>
                Back to current profile
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {setupPaths.map((path) => (
              <button
                key={path.value}
                type="button"
                onClick={() => setSetupPath(path.value)}
                className={cn(
                  "rounded-2xl border px-5 py-4 text-left transition",
                  setupPath === path.value
                    ? "border-brand bg-brand-light"
                    : "border-line bg-white hover:border-brand/20"
                )}
              >
                <p className="text-sm font-semibold text-ink">{path.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{path.description}</p>
              </button>
            ))}
          </div>

          {setupPath === "linkedin_posts" && (
            <SampleEditor
              title="Use your past LinkedIn posts"
              description="Add 3–5 posts that already sound like you. If you do not have enough strong LinkedIn content yet, Quill can also learn from other writing you created yourself."
              posts={linkedinPosts}
              placeholder="Paste a LinkedIn post you're proud of here..."
              onChange={(index, value) => updateSamples("linkedin_posts", index, value)}
              onAdd={() => addSampleCard("linkedin_posts")}
              onRemove={(index) => removeSampleCard("linkedin_posts", index)}
              importSection={
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
                        Download your LinkedIn data export from LinkedIn Settings → Data Privacy →
                        Get a copy of your data → Posts. Then upload the Posts.csv file here.
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
              }
              footerPrompt={
                <div className="mt-5 rounded-xl border border-dashed border-brand/20 bg-brand-light/30 px-4 py-4 text-sm leading-6 text-muted">
                  Not enough strong LinkedIn posts yet? Switch to{" "}
                  <button
                    type="button"
                    onClick={() => setSetupPath("pasted_samples")}
                    className="font-medium text-brand hover:underline"
                  >
                    pasted writing samples
                  </button>{" "}
                  or start from a{" "}
                  <button
                    type="button"
                    onClick={() => setSetupPath("foundation")}
                    className="font-medium text-brand hover:underline"
                  >
                    voice foundation
                  </button>
                  .
                </div>
              }
            />
          )}

          {setupPath === "pasted_samples" && (
            <SampleEditor
              title="Paste writing samples"
              description="Paste 3–5 short samples of anything you personally wrote: old posts, notes, tweets, essays, newsletters, journal fragments, or unfinished drafts. Quill only needs authentic writing, not polished LinkedIn content."
              posts={writingSamples}
              placeholder="Paste something you personally wrote here..."
              onChange={(index, value) => updateSamples("pasted_samples", index, value)}
              onAdd={() => addSampleCard("pasted_samples")}
              onRemove={(index) => removeSampleCard("pasted_samples", index)}
            />
          )}

          {setupPath === "foundation" && (
            <div className="quill-card p-6">
              <div>
                <h2 className="text-lg font-semibold text-ink">Start from a voice foundation</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                  This is a starting point for people who do not have enough past content yet. Pick
                  the closest foundation now, then let Quill adapt it over time as you write more.
                </p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {voiceFoundations.map((foundation) => (
                  <button
                    key={foundation.key}
                    type="button"
                    onClick={() => setSelectedFoundation(foundation.key)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition",
                      selectedFoundation === foundation.key
                        ? "border-brand bg-brand-light"
                        : "border-line bg-white hover:border-brand/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{foundation.label}</p>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {foundation.description}
                        </p>
                      </div>
                      {selectedFoundation === foundation.key && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-brand" />
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {foundation.traits.map((trait) => (
                        <span
                          key={`${foundation.key}-${trait}`}
                          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-brand"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {selectedFoundationData && (
                <div className="mt-5 rounded-xl border border-line bg-slate-50 p-4 text-sm leading-6 text-muted">
                  <p className="font-medium text-ink">What this foundation does</p>
                  <p className="mt-2">{selectedFoundationData.summary}</p>
                  <p className="mt-2">
                    This is a temporary starting foundation, not a final identity. Quill can adapt
                    it as it learns from your real writing.
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            {loading ? (
              <div className="rounded-xl border border-line bg-white px-4 py-4">
                <div className="flex items-center gap-3 text-sm font-medium text-ink">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  <span>{loadingLabel}</span>
                </div>
                {setupPath !== "foundation" && (
                  <p className="mt-2 text-sm text-muted">{progressMessages[progressIndex]}</p>
                )}
              </div>
            ) : setupPath === "foundation" ? (
              <Button onClick={createFoundationProfile}>Start from this foundation →</Button>
            ) : (
              <>
                <Button
                  className={cn(!canAnalyzeSamples && "cursor-not-allowed opacity-60")}
                  onClick={() =>
                    void analyzeFromSamples(setupPath as "linkedin_posts" | "pasted_samples")
                  }
                  disabled={!canAnalyzeSamples}
                >
                  Analyze my voice →
                </Button>
                {!canAnalyzeSamples && (
                  <p className="mt-3 text-sm text-muted">
                    Add at least 2 substantial samples to analyze your voice. 3–5 is better.
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
