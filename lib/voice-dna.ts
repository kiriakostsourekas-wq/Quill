import type { VoiceProfile } from "@prisma/client";
import { groq } from "@/lib/groq";
import {
  getVoiceDimensions,
  getVoiceProfilePromptContext,
  getVoiceProfilePromptGuidance,
  getVoiceProfileStrength,
} from "@/lib/voice-foundations";
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

type VoiceOverlapCheck = {
  shouldRetry: boolean;
  overlapScore: number;
  matchedPhrases: string[];
  hookSimilarity: number;
  sentenceSimilarity: number;
};

const LONG_PHRASE_MIN_WORDS = 5;
const PHRASE_OVERLAP_THRESHOLD = 1;
const HOOK_SIMILARITY_THRESHOLD = 0.65;
const SENTENCE_SIMILARITY_THRESHOLD = 0.84;

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

function jaccardSimilarity(left: string, right: string) {
  const leftSet = new Set(wordsFromText(left));
  const rightSet = new Set(wordsFromText(right));
  if (leftSet.size === 0 || rightSet.size === 0) return 0;

  let intersection = 0;
  for (const word of leftSet) {
    if (rightSet.has(word)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function collectLongPhrases(text: string) {
  const phrases = new Set<string>();
  const words = wordsFromText(text);

  for (let size = LONG_PHRASE_MIN_WORDS; size <= 8; size += 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      const chunk = words.slice(index, index + size);
      if (chunk.filter((word) => !STOP_WORDS.has(word)).length < LONG_PHRASE_MIN_WORDS) {
        continue;
      }
      phrases.add(chunk.join(" "));
    }
  }

  return phrases;
}

function getHook(text: string) {
  return extractSentences(text)[0] ?? text.trim();
}

function checkVoiceSampleOverlap(text: string, samplePosts: string[]): VoiceOverlapCheck {
  const outputSentences = extractSentences(text).filter((sentence) => wordsFromText(sentence).length >= 6);
  const outputPhrases = collectLongPhrases(text);
  const outputHook = getHook(text);
  const matchedPhrases = new Set<string>();
  let hookSimilarity = 0;
  let sentenceSimilarity = 0;

  for (const sample of samplePosts) {
    const sampleHook = getHook(sample);
    hookSimilarity = Math.max(hookSimilarity, jaccardSimilarity(outputHook, sampleHook));

    const samplePhrases = collectLongPhrases(sample);
    for (const phrase of outputPhrases) {
      if (samplePhrases.has(phrase)) {
        matchedPhrases.add(phrase);
      }
    }

    const sampleSentences = extractSentences(sample).filter(
      (sentence) => wordsFromText(sentence).length >= 6
    );
    for (const outputSentence of outputSentences) {
      for (const sampleSentence of sampleSentences) {
        sentenceSimilarity = Math.max(
          sentenceSimilarity,
          jaccardSimilarity(outputSentence, sampleSentence)
        );
      }
    }
  }

  const overlapScore =
    matchedPhrases.size * 2 +
    (hookSimilarity >= HOOK_SIMILARITY_THRESHOLD ? 2 : 0) +
    (sentenceSimilarity >= SENTENCE_SIMILARITY_THRESHOLD ? 2 : 0);

  return {
    shouldRetry:
      matchedPhrases.size >= PHRASE_OVERLAP_THRESHOLD ||
      hookSimilarity >= HOOK_SIMILARITY_THRESHOLD ||
      sentenceSimilarity >= SENTENCE_SIMILARITY_THRESHOLD,
    overlapScore,
    matchedPhrases: [...matchedPhrases].slice(0, 4),
    hookSimilarity,
    sentenceSimilarity,
  };
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

function getConfidencePromptNote(profile: VoiceProfile) {
  const strength = getVoiceProfileStrength(profile);

  switch (strength.state) {
    case "weak":
      return "The profile is weak. Stay conservative, avoid overly distinctive claims, and prefer safe pattern-matching over aggressive personalization.";
    case "forming":
      return "The profile is forming. Personalize moderately, but keep the wording fresh and avoid overfitting to any one habit.";
    default:
      return "The profile is solid. Personalize strongly, but still avoid copying any training wording.";
  }
}

function buildAntiCopyInstruction(extra?: string) {
  return [
    "Imitate voice patterns, rhythm, structure, and tone without reproducing wording from training samples.",
    "Do not reuse exact phrases from training samples.",
    "Do not closely paraphrase sample sentences.",
    "Do not copy hooks or sentence shapes too literally.",
    extra ?? null,
  ]
    .filter(Boolean)
    .join(" ");
}

async function requestVoiceText(messages: Array<{ role: "system" | "user"; content: string }>) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.75,
    max_tokens: 1024,
    messages,
  });

  return getMessageText(completion.choices[0]?.message?.content).trim();
}

export async function generatePatternBasedVoiceText({
  profile,
  systemPrompt,
  userPrompt,
}: {
  profile: VoiceProfile;
  systemPrompt: string;
  userPrompt: string;
}) {
  const baseContext = getVoiceProfilePromptContext(profile, {
    includeSamplePosts: false,
  });
  const baseSystemPrompt = [
    systemPrompt,
    buildAntiCopyInstruction(),
    getVoiceProfilePromptGuidance(profile),
    getConfidencePromptNote(profile),
    "Return only the finished text.",
  ].join("\n\n");

  const firstAttempt = await requestVoiceText([
    { role: "system", content: baseSystemPrompt },
    {
      role: "user",
      content: `Voice profile: ${JSON.stringify(baseContext)}\n\n${userPrompt}`,
    },
  ]);

  const firstOverlap = checkVoiceSampleOverlap(firstAttempt, profile.samplePosts);
  if (!firstOverlap.shouldRetry) {
    return {
      text: firstAttempt,
      overlapCheck: firstOverlap,
      retried: false,
    };
  }

  console.warn("Voice overlap guard triggered", firstOverlap);

  const secondAttempt = await requestVoiceText([
    {
      role: "system",
      content: [
        systemPrompt,
        buildAntiCopyInstruction(
          "The previous draft overlapped too closely with training language. Regenerate with fresher wording, a different opening shape if needed, and no reused long phrases."
        ),
        getVoiceProfilePromptGuidance(profile),
        getConfidencePromptNote(profile),
        "Return only the finished text.",
      ].join("\n\n"),
    },
    {
      role: "user",
      content: `Voice profile: ${JSON.stringify(baseContext)}\n\n${userPrompt}`,
    },
  ]);

  const secondOverlap = checkVoiceSampleOverlap(secondAttempt, profile.samplePosts);
  const useSecondAttempt = secondOverlap.overlapScore < firstOverlap.overlapScore;
  if (secondOverlap.shouldRetry) {
    console.warn("Voice overlap guard still detected overlap after retry", secondOverlap);
  }

  return {
    text: useSecondAttempt ? secondAttempt : firstAttempt,
    overlapCheck: useSecondAttempt ? secondOverlap : firstOverlap,
    retried: true,
  };
}

export async function scoreVoiceText(
  profile: VoiceProfile,
  text: string
): Promise<VoiceScoreResult> {
  const profileStrength = getVoiceProfileStrength(profile);
  const safePublishThresholds =
    profileStrength.state === "weak"
      ? { score: 96, floor: 92 }
      : profileStrength.state === "forming"
        ? { score: 92, floor: 84 }
        : { score: 88, floor: 78 };
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Score this text 0-100 against this voice profile. Return ONLY valid JSON: { score: number, toneScore: number, rhythmScore: number, wordChoiceScore: number, feedback: string, tip: string, safeToPublish: boolean, weakestSentence: string, suggestions: string[] }. Tone score measures whether the opening, posture, and overall feel match the user's established patterns. Rhythm score measures sentence length and paragraph flow. WordChoiceScore measures vocabulary, specificity, and phrasing. Feedback and tip must reference concrete writing habits from the profile, not vague adjectives. Respect the profile-strength signal when judging confidence: weak profiles should produce cautious wording and should almost never be flagged safe to publish. Also identify the single weakest sentence and provide 3 specific, actionable suggestions to make this post sound more like the user. Each suggestion should be one concrete sentence starting with an action verb, preserve the same core meaning, and reflect a recognizable voice pattern such as stronger claim-led hooks, shorter paragraphs, more practical language, less hedging, or clearer teaching structure.",
      },
      {
        role: "user",
        content: `Voice profile: ${JSON.stringify(
          getVoiceProfilePromptContext(profile, { includeSamplePosts: false })
        )}\n\nText:\n${text}`,
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
      ? raw.safeToPublish &&
        score >= safePublishThresholds.score &&
        Math.min(toneScore, rhythmScore, wordChoiceScore) >= safePublishThresholds.floor
      : score >= safePublishThresholds.score &&
        Math.min(toneScore, rhythmScore, wordChoiceScore) >= safePublishThresholds.floor;
  const baseFeedback =
    raw.feedback?.trim() || "This draft needs a stronger match to your Voice DNA.";
  const baseTip =
    raw.tip?.trim() || "Use a more natural sentence rhythm and phrasing that sounds like you.";
  const cautiousPrefix =
    profileStrength.state === "weak"
      ? "Voice profile is still weak, so treat this score as directional rather than definitive."
      : profileStrength.state === "forming"
        ? "Voice profile is still forming, so treat this as a guided check rather than a final verdict."
        : "";

  return {
    score,
    toneScore,
    rhythmScore,
    wordChoiceScore,
    feedback: cautiousPrefix ? `${cautiousPrefix} ${baseFeedback}` : baseFeedback,
    tip:
      profileStrength.state === "weak"
        ? `${baseTip} Add more authentic samples if you want a stronger Voice DNA check.`
        : baseTip,
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
