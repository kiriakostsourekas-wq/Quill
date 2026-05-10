import type { VoiceProfile } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { parseJsonArray, parseJsonObject } from "@/lib/utils";
import {
  dedupeImportedVoicePosts,
  normalizeImportedVoicePost,
} from "@/lib/voice-dna-import";
import * as voiceAnalyzeTestHelpers from "@/lib/voice-analysis-quality";
import {
  generatePatternBasedVoiceText,
  scoreVoiceText,
  voiceDnaTestHelpers,
} from "@/lib/voice-dna";
import { groq } from "@/lib/groq";

const solidSamplePosts = [
  "I like to start with a concrete claim and then explain the operating principle behind it. The best teams do not win because they add more process. They win because the process they keep creates clearer decisions, cleaner ownership, and less performative work. That distinction matters when a company grows beyond the stage where everyone can rely on memory. The same principle applies to publishing, onboarding, and product reviews: useful systems reduce interpretation, not judgment.",
  "Most advice about consistency is incomplete because it treats output like the goal. Consistency is useful only when it sharpens judgment. A strong publishing habit should make your thinking more specific, your examples easier to recall, and your point of view easier to trust. Otherwise it is just a calendar with better branding. The habit only compounds when each post leaves behind a clearer claim than the one before it.",
  "A useful system should make the next good action obvious. If someone needs a meeting to understand the process, the process is probably carrying too much hidden context. The fix is not more ceremony. The fix is fewer ambiguous handoffs, cleaner defaults, and a shared definition of what good looks like before the work starts. That is the real value of operating cadence: it gives people enough structure to move without waiting for permission.",
];

function makeProfile(overrides: Partial<VoiceProfile> = {}): VoiceProfile {
  return {
    id: "voice_profile_1",
    userId: "user_1",
    setupSource: "pasted_samples",
    foundationKey: null,
    samplePosts: solidSamplePosts,
    excludedPosts: [],
    traits: ["Claim-led hooks", "Practical framing", "Clean takeaways"],
    dimensions: {
      sentenceLengthTendency: "Mostly medium-length sentences.",
      paragraphStyle: "Short, clean paragraphs.",
      hookStyle: "Usually opens with a direct claim.",
      storytellingVsTeaching: "Leans toward teaching through practical examples.",
      directnessVsHedging: "Direct with limited hedging.",
      orientation: "Practical and operating-system oriented.",
      listUsage: "Uses lists only when helpful.",
      emojiUsage: "No emoji use.",
      ctaTendency: "Light-touch CTA or none.",
      confidenceStyle: "Calm and decisive.",
      languageStyle: "Plain professional language.",
      notablePatterns: ["Starts with a claim", "Ends with a takeaway"],
    },
    sentenceLength: "medium",
    formality: "neutral",
    usesQuestions: false,
    usesLists: false,
    summary: "A practical, claim-led writing style.",
    lastAnalyzedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  } as VoiceProfile;
}

function mockGroqResponses(contents: string[]) {
  const calls: unknown[] = [];
  const createMock = vi.spyOn(groq.chat.completions, "create");

  createMock.mockImplementation(((args: unknown) => {
    calls.push(args);
    const content = contents[Math.min(calls.length - 1, contents.length - 1)] ?? "";
    return Promise.resolve({
      choices: [
        {
          message: {
            content,
          },
        },
      ],
    }) as unknown as ReturnType<typeof groq.chat.completions.create>;
  }) as typeof groq.chat.completions.create);

  return {
    calls,
    restore() {
      createMock.mockRestore();
    },
  };
}

describe("Voice DNA helpers", () => {
  it("parses fenced or prefixed model JSON output", () => {
    const object = parseJsonObject<{ score: number; meta: { ok: boolean } }>(
      'Here is the result:\n```json\n{"score":91,"meta":{"ok":true}}\n```\nDone.'
    );
    expect(object).toEqual({ score: 91, meta: { ok: true } });

    const array = parseJsonArray<Array<{ hook: string }>>(
      'Ideas:\n[{"hook":"Start with the hard part"},{"hook":"Make the default obvious"}]\n'
    );
    expect(array).toEqual([
      { hook: "Start with the hard part" },
      { hook: "Make the default obvious" },
    ]);

    expect(() => parseJsonObject("No JSON payload here")).toThrow();
  });

  it("normalizes and dedupes imported Voice DNA posts against existing posts", () => {
    const result = dedupeImportedVoicePosts(
      [
        "  Existing post with odd spacing  ",
        "New post\nwith line breaks",
        "new post with line breaks",
        "",
        "Another useful sample",
      ],
      ["Existing    post with odd spacing"]
    );

    expect(result).toEqual(["New post with line breaks", "Another useful sample"]);
    expect(normalizeImportedVoicePost("A\tpost\nwith    space")).toBe("A post with space");
  });

  it("catches duplicate, thin, and near-duplicate voice analysis samples", () => {
    const unique = voiceAnalyzeTestHelpers.stripExactDuplicates([
      " Same post with useful detail ",
      "same   post with useful detail",
      "A different sample with another point",
    ]);
    expect(unique).toEqual([
      "Same post with useful detail",
      "A different sample with another point",
    ]);

    const nearDuplicate = voiceAnalyzeTestHelpers.findNearDuplicatePair([
      "I write about building reliable systems because teams need context before making decisions.",
      "I write about building reliable systems because teams need context before making decisions today.",
    ]);
    expect(nearDuplicate).toBeTruthy();

    const repetitive = "focus focus focus focus focus focus focus focus focus focus focus focus";
    expect(voiceAnalyzeTestHelpers.findLowDiversitySample([repetitive])).toBe(repetitive);
    expect(voiceAnalyzeTestHelpers.uniqueWordRatio(repetitive)).toBeLessThan(0.45);

    expect(
      voiceAnalyzeTestHelpers.buildOnboardingVoiceSeed({
        userType: "creator",
        communicationStyle: "direct",
        contrarianBelief: "Generic output is not a strategy.",
      })
    ).toBeNull();
    expect(
      voiceAnalyzeTestHelpers.buildOnboardingVoiceSeed({
        userType: "beginner",
        communicationStyle: "direct",
        contrarianBelief: "Generic output is not a strategy.",
      }) ?? ""
    ).toMatch(/additional voice signal/);
  });

  it("detects copied training phrasing in the voice overlap guard", () => {
    const sample =
      "Strong teams build clear operating systems because vague decisions create hidden costs.";
    const overlap = voiceDnaTestHelpers.checkVoiceSampleOverlap(sample, [sample]);

    expect(overlap.shouldRetry).toBe(true);
    expect(overlap.hookSimilarity).toBe(1);
    expect(overlap.sentenceSimilarity).toBe(1);
    expect(overlap.matchedPhrases.length).toBeGreaterThan(0);

    const fresh = voiceDnaTestHelpers.checkVoiceSampleOverlap(
      "Useful writing makes one concrete promise and then earns it with a specific example.",
      [sample]
    );
    expect(fresh.shouldRetry).toBe(false);
  });

  it("retries pattern-based generation when the first draft overlaps training samples", async () => {
    const copied =
      "Strong teams build clear operating systems because vague decisions create hidden costs.";
    const fresh =
      "Useful writing starts with one specific promise, then proves it with an example readers can apply.";
    const mock = mockGroqResponses([copied, fresh]);
    const warnMock = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      const result = await generatePatternBasedVoiceText({
        profile: makeProfile({ samplePosts: [copied] }),
        systemPrompt: "Write like the profile.",
        userPrompt: "Draft a post about operating systems.",
      });

      expect(result.retried).toBe(true);
      expect(result.text).toBe(fresh);
      expect(mock.calls).toHaveLength(2);
      expect(JSON.stringify(mock.calls[1])).toMatch(
        /previous draft overlapped too closely with training language/
      );
    } finally {
      warnMock.mockRestore();
      mock.restore();
    }
  });

  it("clamps scores and fills weakest sentence and suggestion fallbacks", async () => {
    const mock = mockGroqResponses([
      `Model output:\n${JSON.stringify({
        score: 101.6,
        toneScore: -4,
        feedback: "",
        tip: "",
        weakestSentence: "This sentence is not present.",
        suggestions: ["Open with a sharper claim."],
        safeToPublish: true,
      })}`,
    ]);

    try {
      const result = await scoreVoiceText(
        makeProfile(),
        "First sentence needs work. Second sentence is clear."
      );

      expect(result.score).toBe(100);
      expect(result.toneScore).toBe(0);
      expect(result.rhythmScore).toBe(98);
      expect(result.wordChoiceScore).toBe(100);
      expect(result.safeToPublish).toBe(false);
      expect(result.weakestSentence).toBe("First sentence needs work.");
      expect(result.feedback).toBe("This draft needs a stronger match to your Voice DNA.");
      expect(result.tip).toBe("Use a more natural sentence rhythm and phrasing that sounds like you.");
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions[0]).toBe("Open with a sharper claim.");
    } finally {
      mock.restore();
    }
  });
});
