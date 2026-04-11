"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type VoiceProfile = {
  traits: string[];
  sentenceLength?: string | null;
  formality?: string | null;
  usesQuestions: boolean;
  usesLists: boolean;
  summary?: string | null;
};

export function VoiceDnaClient() {
  const [rawSamples, setRawSamples] = useState("");
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(false);

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

  async function analyzeVoice() {
    setLoading(true);
    try {
      const samplePosts = rawSamples
        .split(/\n\s*\n|\n/)
        .map((sample) => sample.trim())
        .filter(Boolean);

      const response = await fetch("/api/voice/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samplePosts }),
      });

      const data = await response.json();
      setProfile(data.profile ?? null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Voice DNA</h1>
        <p className="mt-1 text-sm text-muted">
          Train Quill on your strongest posts and score each new draft against that voice.
        </p>
      </div>

      <div className="quill-card p-6">
        <h2 className="text-lg font-semibold text-ink">Train your voice</h2>
        <label className="mt-4 block text-sm font-medium text-ink">
          Paste 3–5 of your best past posts here (one per line or separated by blank lines)
        </label>
        <textarea
          value={rawSamples}
          onChange={(event) => setRawSamples(event.target.value)}
          className="quill-textarea mt-3 min-h-[220px]"
          placeholder="Paste your best performing posts here..."
        />
        <Button className="mt-5" onClick={analyzeVoice} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze my voice →"}
        </Button>
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
                <p className="mt-1 font-medium text-ink capitalize">{profile.sentenceLength}</p>
              </div>
              <div className="rounded-lg border border-line p-4">
                <p className="text-muted">Formality level</p>
                <p className="mt-1 font-medium text-ink capitalize">{profile.formality}</p>
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
              onClick={() => setRawSamples("")}
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
