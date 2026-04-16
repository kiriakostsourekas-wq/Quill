import type { VoiceProfile } from "@prisma/client";
import { groq } from "@/lib/groq";
import { getVoiceDimensions, getVoiceProfilePromptContext } from "@/lib/voice-foundations";
import { prisma } from "@/lib/prisma";
import { parseJsonObject } from "@/lib/utils";

export type VoiceScoreResult = {
  score: number;
  toneScore: number;
  rhythmScore: number;
  wordChoiceScore: number;
  feedback: string;
  tip: string;
  signaturePhrases: string[];
  safeToPublish: boolean;
  weakestSentence: string;
  suggestions: string[];
};

type GroqScoreResult = {
  score?: number;
  toneScore?: number;
  rhythmScore?: number;
  wordChoiceScore?: number;
  feedback?: string;
  tip?: string;
  safeToPublish?: boolean;
  weakestSentence?: string;
  suggestions?: string[];
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "so",
  "that",
  "the",
  "their",
  "there",
  "they",
  "this",
  "to",
  "was",
  "we",
  "what",
  "when",
  "with",
  "you",
  "your",
]);

function getMessageText(
  content: string | Array<{ type?: string; text?: string }> | null | undefined
) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => ("text" in item ? item.text ?? "" : ""))
      .join("");
  }
  return "";
}

function extractSentences(text: string) {
  const matches = Array.from(text.matchAll(/[^.!?\n]+(?:[.!?]+|$)/g));
  return matches
    .map((match) => (match[0] ?? "").trim())
    .filter(Boolean);
}

function clampScore(value: number | undefined, fallback: number) {
  return Math.max(0, Math.min(100, Math.round(value ?? fallback)));
}

function wordsFromText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function buildSignaturePhraseCandidates(profile: VoiceProfile) {
  const phraseCounts = new Map<string, number>();

  for (const sample of profile.samplePosts) {
    const words = wordsFromText(sample);
    for (let size = 2; size <= 4; size += 1) {
      for (let index = 0; index <= words.length - size; index += 1) {
        const chunk = words.slice(index, index + size);
        if (chunk.some((word) => STOP_WORDS.has(word))) continue;
        const phrase = chunk.join(" ");
        phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
      }
    }
  }

  return [...phraseCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([phrase]) => phrase)
    .slice(0, 8);
}

function detectSignaturePhrases(profile: VoiceProfile, text: string) {
  const normalizedText = ` ${text.toLowerCase()} `;
  return buildSignaturePhraseCandidates(profile)
    .filter((phrase) => normalizedText.includes(` ${phrase} `))
    .slice(0, 4)
    .map((phrase) =>
      phrase
        .split(" ")
        .map((part) => (part.length > 2 ? part[0].toUpperCase() + part.slice(1) : part))
        .join(" ")
    );
}

function pickWeakestSentence(text: string, weakestSentence?: string) {
  const sentences = extractSentences(text);
  if (!weakestSentence) return sentences[0] ?? text.trim();

  const direct = text.includes(weakestSentence) ? weakestSentence : null;
  if (direct) return direct;

  const normalized = weakestSentence.trim().replace(/\s+/g, " ");
  const sentenceMatch = sentences.find(
    (sentence) => sentence.replace(/\s+/g, " ") === normalized
  );

  return sentenceMatch ?? sentences[0] ?? text.trim();
}

function fallbackSuggestions(profile: VoiceProfile, weakestSentence: string) {
  const dimensions = getVoiceDimensions(profile);

  return [
    `Lead with ${dimensions.hookStyle.toLowerCase().replace(/\.$/, "")} while keeping the same core idea.`,
    `Rewrite this as one sentence that matches your usual paragraph style and pacing.`,
    `Use wording that feels more ${dimensions.orientation.toLowerCase().replace(/\.$/, "")} than "${weakestSentence}".`,
  ];
}

function normalizeSuggestions(
  suggestions: string[] | undefined,
  profile: VoiceProfile,
  weakestSentence: string
) {
  const normalized = (suggestions ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (normalized.length === 3) {
    return normalized;
  }

  const fallbacks = fallbackSuggestions(profile, weakestSentence);
  const next = [...normalized];

  for (const fallback of fallbacks) {
    if (next.length === 3) break;
    next.push(fallback);
  }

  return next.slice(0, 3);
}

export async function scoreVoiceText(
  profile: VoiceProfile,
  text: string
): Promise<VoiceScoreResult> {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Score this text 0-100 against this voice profile. Return ONLY valid JSON: { score: number, toneScore: number, rhythmScore: number, wordChoiceScore: number, feedback: string, tip: string, safeToPublish: boolean, weakestSentence: string, suggestions: string[] }. Tone score measures whether the opening, posture, and overall feel match the user's established patterns. Rhythm score measures sentence length and paragraph flow. WordChoiceScore measures vocabulary, specificity, and phrasing. Feedback and tip must reference concrete writing habits from the profile, not vague adjectives. Also identify the single weakest sentence and provide 3 specific, actionable suggestions to make this post sound more like the user. Each suggestion should be one concrete sentence starting with an action verb, preserve the same core meaning, and reflect a recognizable voice pattern such as stronger claim-led hooks, shorter paragraphs, more practical language, less hedging, or clearer teaching structure.",
      },
      {
        role: "user",
        content: `Voice profile: ${JSON.stringify(getVoiceProfilePromptContext(profile))}\n\nText:\n${text}`,
      },
    ],
  });

  const content = getMessageText(completion.choices[0]?.message?.content);
  const raw = parseJsonObject<GroqScoreResult>(content);
  const weakestSentence = pickWeakestSentence(text, raw.weakestSentence);
  const suggestions = normalizeSuggestions(raw.suggestions, profile, weakestSentence);
  const score = clampScore(raw.score, 0);
  const toneScore = clampScore(raw.toneScore, score + 2);
  const rhythmScore = clampScore(raw.rhythmScore, score - 2);
  const wordChoiceScore = clampScore(raw.wordChoiceScore, score + 1);
  const signaturePhrases = detectSignaturePhrases(profile, text);
  const safeToPublish =
    typeof raw.safeToPublish === "boolean"
      ? raw.safeToPublish
      : score >= 88 && Math.min(toneScore, rhythmScore, wordChoiceScore) >= 78;

  return {
    score,
    toneScore,
    rhythmScore,
    wordChoiceScore,
    feedback: raw.feedback?.trim() || "This draft needs a stronger match to your Voice DNA.",
    tip: raw.tip?.trim() || "Use a more natural sentence rhythm and phrasing that sounds like you.",
    signaturePhrases,
    safeToPublish,
    weakestSentence,
    suggestions,
  };
}

export async function scoreVoiceTextForUser(userId: string, text: string) {
  const profile = await prisma.voiceProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return {
      profile: null,
      result: null,
    };
  }

  const result = await scoreVoiceText(profile, text);
  return {
    profile,
    result,
  };
}

export function toStoredVoiceFields(result: VoiceScoreResult | null) {
  if (!result) {
    return {
      voiceScore: null,
      voiceToneScore: null,
      voiceRhythmScore: null,
      voiceWordChoiceScore: null,
      voiceFeedback: null,
      voiceTip: null,
      voiceSignaturePhrases: [],
      voiceSafeToPublish: null,
      voiceWeakestSentence: null,
      voiceSuggestions: [],
      lastVoiceScoredAt: null,
    };
  }

  return {
    voiceScore: result.score,
    voiceToneScore: result.toneScore,
    voiceRhythmScore: result.rhythmScore,
    voiceWordChoiceScore: result.wordChoiceScore,
    voiceFeedback: result.feedback,
    voiceTip: result.tip,
    voiceSignaturePhrases: result.signaturePhrases,
    voiceSafeToPublish: result.safeToPublish,
    voiceWeakestSentence: result.weakestSentence,
    voiceSuggestions: result.suggestions,
    lastVoiceScoredAt: new Date(),
  };
}
