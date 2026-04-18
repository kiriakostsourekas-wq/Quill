export const voiceSetupSources = [
  "linkedin_posts",
  "pasted_samples",
  "foundation",
] as const;

export type VoiceSetupSource = (typeof voiceSetupSources)[number];

export type VoiceDimensions = {
  sentenceLengthTendency: string;
  paragraphStyle: string;
  hookStyle: string;
  storytellingVsTeaching: string;
  directnessVsHedging: string;
  orientation: string;
  listUsage: string;
  emojiUsage: string;
  ctaTendency: string;
  confidenceStyle: string;
  languageStyle: string;
  notablePatterns: string[];
};

export type VoiceProfileStrength = {
  state: "weak" | "forming" | "solid";
  label: string;
  note: string;
};

export type VoiceProfileSampleSignal = {
  substantialSampleCount: number;
  uniqueSampleCount: number;
  totalSampleLength: number;
};

export type VoiceProfileLike = {
  setupSource?: string | null;
  foundationKey?: string | null;
  samplePosts?: string[];
  sampleSignal?: Partial<VoiceProfileSampleSignal> | null;
  traits?: string[];
  dimensions?: unknown;
  sentenceLength?: string | null;
  formality?: string | null;
  usesQuestions?: boolean;
  usesLists?: boolean;
  summary?: string | null;
};

export const voiceDimensionLabels: Record<keyof VoiceDimensions, string> = {
  sentenceLengthTendency: "Sentence length",
  paragraphStyle: "Paragraph style",
  hookStyle: "Hook style",
  storytellingVsTeaching: "Story vs teaching",
  directnessVsHedging: "Directness",
  orientation: "Orientation",
  listUsage: "List usage",
  emojiUsage: "Emoji usage",
  ctaTendency: "CTA tendency",
  confidenceStyle: "Confidence",
  languageStyle: "Language",
  notablePatterns: "Notable patterns",
};

function createDimensions(dimensions: VoiceDimensions): VoiceDimensions {
  return dimensions;
}

export const voiceFoundations = [
  {
    key: "clear_professional",
    label: "Clear and professional",
    description: "Thoughtful, credible, and easy to follow without sounding stiff.",
    traits: ["Clean openings", "Medium sentences", "Practical takeaways"],
    sentenceLength: "medium",
    formality: "neutral",
    usesQuestions: false,
    usesLists: false,
    summary:
      "You tend to explain ideas cleanly, move in measured sentences, and land on practical takeaways rather than flourishes.",
    promptNotes:
      "Prioritize clarity, calm confidence, and straightforward phrasing. Avoid hype and unnecessary flourish.",
    dimensions: createDimensions({
      sentenceLengthTendency: "Mostly medium-length sentences with a steady cadence.",
      paragraphStyle: "Short, clean paragraphs with one main point at a time.",
      hookStyle: "Usually opens with a clear claim or crisp observation.",
      storytellingVsTeaching: "Leans more toward explanation than storytelling.",
      directnessVsHedging: "Direct, but not aggressive or overconfident.",
      orientation: "More practical than reflective.",
      listUsage: "Uses lists occasionally when they make the point clearer.",
      emojiUsage: "Rarely uses emojis.",
      ctaTendency: "Light-touch CTA or none at all.",
      confidenceStyle: "Calm, credible, and measured.",
      languageStyle: "Simple professional language with low jargon.",
      notablePatterns: [
        "Gets to the point quickly",
        "Explains with structure",
        "Ends with a grounded takeaway",
      ],
    }),
  },
  {
    key: "warm_reflective",
    label: "Warm and reflective",
    description: "Human, thoughtful, and personal without becoming vague.",
    traits: ["Personal openings", "Reflective turns", "Gentle cadence"],
    sentenceLength: "medium",
    formality: "casual",
    usesQuestions: true,
    usesLists: false,
    summary:
      "You tend to write in a personal, reflective way, often using warm observations and softer transitions instead of hard claims.",
    promptNotes:
      "Lean into honest reflection, human moments, and emotionally intelligent phrasing. Keep it grounded and sincere.",
    dimensions: createDimensions({
      sentenceLengthTendency: "Mostly medium sentences with occasional longer reflective lines.",
      paragraphStyle: "Short paragraphs with breathing room between ideas.",
      hookStyle: "Often starts with an observation, feeling, or reflective moment.",
      storytellingVsTeaching: "Leans more toward storytelling and reflection than teaching.",
      directnessVsHedging: "Gentle and nuanced rather than blunt.",
      orientation: "More reflective than purely practical.",
      listUsage: "Rarely uses lists.",
      emojiUsage: "Low emoji use, if any.",
      ctaTendency: "Sometimes invites reflection instead of using a direct CTA.",
      confidenceStyle: "Quietly confident, not forceful.",
      languageStyle: "Plain but expressive language with emotional texture.",
      notablePatterns: [
        "Moves through a personal thought process",
        "Uses softer transitions",
        "Leaves the reader with a feeling or lesson",
      ],
    }),
  },
  {
    key: "sharp_contrarian",
    label: "Sharp and contrarian",
    description: "Pointed, opinionated, and crisp without becoming performative.",
    traits: ["Strong-claim hooks", "Short paragraphs", "Hard contrasts"],
    sentenceLength: "short",
    formality: "neutral",
    usesQuestions: false,
    usesLists: false,
    summary:
      "You tend to lead with a clear point of view, keep the pace tight, and use contrast to challenge lazy thinking.",
    promptNotes:
      "Use short sentences, strong opinions, and clear contrasts. Avoid generic motivational language.",
    dimensions: createDimensions({
      sentenceLengthTendency: "Mostly short sentences with tight pacing.",
      paragraphStyle: "Very short paragraphs, often one idea per line.",
      hookStyle: "Usually opens with a strong claim or sharp observation.",
      storytellingVsTeaching: "Leans more toward opinion than narrative or step-by-step teaching.",
      directnessVsHedging: "Direct with very little hedging.",
      orientation: "More practical and judgment-based than reflective.",
      listUsage: "Rarely uses lists unless making a hard contrast.",
      emojiUsage: "Almost never uses emojis.",
      ctaTendency: "May end with a blunt takeaway instead of a CTA.",
      confidenceStyle: "High confidence and decisive phrasing.",
      languageStyle: "Simple but dense language with punchy wording.",
      notablePatterns: [
        "Starts fast",
        "Uses contrast to make the point",
        "Avoids unnecessary setup",
      ],
    }),
  },
  {
    key: "educational_structured",
    label: "Educational and structured",
    description: "Teaches clearly, organizes ideas well, and makes takeaways obvious.",
    traits: ["Structured hooks", "Framework language", "Clear takeaways"],
    sentenceLength: "medium",
    formality: "neutral",
    usesQuestions: false,
    usesLists: true,
    summary:
      "You tend to teach in a structured way, organize the flow clearly, and make the takeaway easy to act on.",
    promptNotes:
      "Favor ordered explanations, practical insights, and concise teaching. Make the structure visible and helpful.",
    dimensions: createDimensions({
      sentenceLengthTendency: "Mostly medium-length sentences optimized for clarity.",
      paragraphStyle: "Structured paragraphs that build step by step.",
      hookStyle: "Often opens with a lesson, framework, or useful claim.",
      storytellingVsTeaching: "Leans strongly toward teaching and explanation.",
      directnessVsHedging: "Clear and assertive without sounding harsh.",
      orientation: "Strongly practical and useful.",
      listUsage: "Frequently uses numbered or structured lists.",
      emojiUsage: "Low or no emoji use.",
      ctaTendency: "May end with a practical next step or takeaway.",
      confidenceStyle: "Confident through structure rather than hype.",
      languageStyle: "Clear instructional language with moderate density.",
      notablePatterns: [
        "Makes structure visible",
        "Names the lesson explicitly",
        "Ends with something usable",
      ],
    }),
  },
  {
    key: "simple_direct",
    label: "Simple and direct",
    description: "Plainspoken, efficient, and easy to trust.",
    traits: ["Plain language", "Short sentences", "Fast clarity"],
    sentenceLength: "short",
    formality: "casual",
    usesQuestions: false,
    usesLists: false,
    summary:
      "You tend to use plain language, shorter sentences, and a direct path to the point without extra decoration.",
    promptNotes:
      "Prefer plain language, shorter sentences, and clear takes. Avoid jargon and decorative phrasing.",
    dimensions: createDimensions({
      sentenceLengthTendency: "Mostly short sentences.",
      paragraphStyle: "Short paragraphs with minimal setup.",
      hookStyle: "Usually starts by naming the point directly.",
      storytellingVsTeaching: "Balanced, but simplified for quick understanding.",
      directnessVsHedging: "Direct with little hedging.",
      orientation: "More practical than reflective.",
      listUsage: "Occasional lists, only when useful.",
      emojiUsage: "Rarely uses emojis.",
      ctaTendency: "Often ends cleanly without an elaborate CTA.",
      confidenceStyle: "Straightforward and matter-of-fact.",
      languageStyle: "Simple vocabulary and low density.",
      notablePatterns: [
        "Uses plainspoken wording",
        "Avoids extra buildup",
        "Keeps the point easy to follow",
      ],
    }),
  },
  {
    key: "founder_operator",
    label: "Founder/operator",
    description: "Grounded in execution, lessons, and real-world tradeoffs.",
    traits: ["Operator framing", "Lesson hooks", "Concrete tradeoffs"],
    sentenceLength: "medium",
    formality: "neutral",
    usesQuestions: false,
    usesLists: true,
    summary:
      "You tend to write from execution, constraints, and lived tradeoffs, using lessons from building rather than abstract commentary.",
    promptNotes:
      "Anchor the writing in execution, constraints, and lessons learned. Sound like someone who has done the work.",
    dimensions: createDimensions({
      sentenceLengthTendency: "Mostly medium sentences with a practical rhythm.",
      paragraphStyle: "Short-to-medium paragraphs that move from problem to lesson.",
      hookStyle: "Often starts with a lesson, hard truth, or decision from real work.",
      storytellingVsTeaching: "Blends teaching with operator stories and lessons.",
      directnessVsHedging: "Direct, but grounded in what happened.",
      orientation: "Strongly practical and execution-oriented.",
      listUsage: "Comfortable using lists to clarify lessons or steps.",
      emojiUsage: "Rarely uses emojis.",
      ctaTendency: "Sometimes ends with a takeaway or challenge to the reader.",
      confidenceStyle: "Earned confidence backed by specifics.",
      languageStyle: "Concrete language with moderate density and little fluff.",
      notablePatterns: [
        "Talks in tradeoffs",
        "Uses lessons from real execution",
        "Prefers specifics over abstractions",
      ],
    }),
  },
] as const;

export type VoiceFoundationKey = (typeof voiceFoundations)[number]["key"];

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getVoiceFoundation(key: string | null | undefined) {
  return voiceFoundations.find((foundation) => foundation.key === key) ?? null;
}

export function getVoiceSetupSourceLabel(source: string | null | undefined) {
  switch (source) {
    case "linkedin_posts":
      return "Past LinkedIn posts";
    case "pasted_samples":
      return "Pasted writing samples";
    case "foundation":
      return "Voice foundation";
    default:
      return "Voice DNA";
  }
}

export function getLegacyVoiceDimensions(profile: VoiceProfileLike): VoiceDimensions {
  const foundation = getVoiceFoundation(profile.foundationKey);

  if (foundation) {
    return foundation.dimensions;
  }

  return {
    sentenceLengthTendency:
      profile.sentenceLength === "short"
        ? "Mostly short sentences with a quicker pace."
        : profile.sentenceLength === "long"
          ? "Leans toward longer sentences with more buildup."
          : "Mostly medium-length sentences with a steady pace.",
    paragraphStyle: profile.usesLists
      ? "Often breaks ideas into structured chunks or list-like sections."
      : "Usually uses short paragraphs rather than dense blocks of text.",
    hookStyle: profile.usesQuestions
      ? "Often opens with a question or tension point."
      : "Usually opens with a claim, observation, or stated idea.",
    storytellingVsTeaching: "Mixes explanation and personal voice, depending on the topic.",
    directnessVsHedging:
      profile.formality === "casual"
        ? "Tends to sound more direct and conversational."
        : "Usually sounds measured rather than blunt.",
    orientation: "Leans practical over abstract.",
    listUsage: profile.usesLists ? "Uses lists fairly often." : "Rarely uses lists.",
    emojiUsage: "Emoji use is not yet strongly established.",
    ctaTendency: "CTA habit is not yet strongly established.",
    confidenceStyle:
      profile.formality === "formal"
        ? "Measured and composed."
        : "Calm and conversational.",
    languageStyle:
      profile.formality === "formal"
        ? "More polished language with moderate density."
        : "Simpler language with lower friction.",
    notablePatterns: (profile.traits ?? []).slice(0, 4),
  };
}

export function getVoiceDimensions(profile: VoiceProfileLike): VoiceDimensions {
  const candidate = asObject(profile.dimensions);
  if (!candidate) {
    return getLegacyVoiceDimensions(profile);
  }

  const legacy = getLegacyVoiceDimensions(profile);
  return {
    sentenceLengthTendency: asString(
      candidate.sentenceLengthTendency,
      legacy.sentenceLengthTendency
    ),
    paragraphStyle: asString(candidate.paragraphStyle, legacy.paragraphStyle),
    hookStyle: asString(candidate.hookStyle, legacy.hookStyle),
    storytellingVsTeaching: asString(
      candidate.storytellingVsTeaching,
      legacy.storytellingVsTeaching
    ),
    directnessVsHedging: asString(
      candidate.directnessVsHedging,
      legacy.directnessVsHedging
    ),
    orientation: asString(candidate.orientation, legacy.orientation),
    listUsage: asString(candidate.listUsage, legacy.listUsage),
    emojiUsage: asString(candidate.emojiUsage, legacy.emojiUsage),
    ctaTendency: asString(candidate.ctaTendency, legacy.ctaTendency),
    confidenceStyle: asString(candidate.confidenceStyle, legacy.confidenceStyle),
    languageStyle: asString(candidate.languageStyle, legacy.languageStyle),
    notablePatterns: asStringArray(candidate.notablePatterns, legacy.notablePatterns).slice(0, 4),
  };
}

export function getVoiceProfileSampleSignal(profile: VoiceProfileLike): VoiceProfileSampleSignal {
  const candidate = asObject(profile.sampleSignal);
  if (candidate) {
    return {
      substantialSampleCount: Math.max(
        0,
        Math.round(asNumber(candidate.substantialSampleCount, 0))
      ),
      uniqueSampleCount: Math.max(0, Math.round(asNumber(candidate.uniqueSampleCount, 0))),
      totalSampleLength: Math.max(0, Math.round(asNumber(candidate.totalSampleLength, 0))),
    };
  }

  const normalizedSamples = (profile.samplePosts ?? [])
    .map((sample) => sample.trim())
    .filter(Boolean);
  const substantiveSamples = normalizedSamples.filter((sample) => sample.length >= 40);

  return {
    substantialSampleCount: substantiveSamples.length,
    uniqueSampleCount: new Set(
      normalizedSamples.map((sample) => sample.toLowerCase().replace(/\s+/g, " "))
    ).size,
    totalSampleLength: substantiveSamples.reduce((sum, sample) => sum + sample.length, 0),
  };
}

export function getVoiceProfileStrength(profile: {
  setupSource?: string | null;
  foundationKey?: string | null;
  samplePosts?: string[];
  sampleSignal?: Partial<VoiceProfileSampleSignal> | null;
}): VoiceProfileStrength {
  const source = profile.setupSource ?? "linkedin_posts";
  const signal = getVoiceProfileSampleSignal(profile);

  if (source === "foundation") {
    return {
      state: "weak",
      label: "Voice profile: weak",
      note: "This is a starting foundation. Quill can help, but real writing samples will make the voice much more trustworthy.",
    };
  }

  if (signal.substantialSampleCount < 2 || signal.totalSampleLength < 500) {
    return {
      state: "weak",
      label: "Voice profile: weak",
      note: "Quill has very limited signal right now. Add more authentic samples before trusting the voice too much.",
    };
  }

  if (
    signal.substantialSampleCount < 3 ||
    signal.uniqueSampleCount < 3 ||
    signal.totalSampleLength < 1100
  ) {
    return {
      state: "forming",
      label: "Voice profile: forming",
      note: "Quill has enough to help, but another good sample or two will make generation and scoring more reliable.",
    };
  }

  return {
    state: "solid",
    label: "Voice profile: solid",
    note: "Quill has enough signal to generate, refine, and score with stronger confidence.",
  };
}

export function getVoiceProfilePromptGuidance(profile: VoiceProfileLike) {
  const strength = getVoiceProfileStrength(profile);

  switch (strength.state) {
    case "weak":
      return "The voice profile is weak. Use only broad patterns from the profile, stay conservative, and prefer clear safe wording over distinctive imitation.";
    case "forming":
      return "The voice profile is forming. Follow the established patterns, but keep the language fresh and avoid overcommitting to any one pattern.";
    default:
      return "The voice profile is solid. Personalize confidently, but still imitate patterns rather than specific wording.";
  }
}

export function getVoiceProfilePromptContext(
  profile: VoiceProfileLike,
  options?: { includeSamplePosts?: boolean }
) {
  const foundation = getVoiceFoundation(profile.foundationKey);
  const dimensions = getVoiceDimensions(profile);
  const sampleSignal = getVoiceProfileSampleSignal(profile);
  const profileStrength = getVoiceProfileStrength(profile);

  return {
    setupSource: profile.setupSource ?? "linkedin_posts",
    foundation: foundation
      ? {
          key: foundation.key,
          label: foundation.label,
          description: foundation.description,
          promptNotes: foundation.promptNotes,
        }
      : null,
    traits: profile.traits ?? [],
    dimensions,
    sentenceLength: profile.sentenceLength ?? null,
    formality: profile.formality ?? null,
    usesQuestions: profile.usesQuestions ?? false,
    usesLists: profile.usesLists ?? false,
    summary: profile.summary ?? null,
    sampleSignal,
    profileStrength: {
      state: profileStrength.state,
      note: profileStrength.note,
    },
    ...(options?.includeSamplePosts ? { samplePosts: profile.samplePosts ?? [] } : {}),
  };
}

export function getVoiceProfileClientState(profile: VoiceProfileLike | null | undefined) {
  if (!profile) return null;

  return {
    setupSource: profile.setupSource ?? "linkedin_posts",
    foundationKey: profile.foundationKey ?? null,
    traits: profile.traits ?? [],
    dimensions: getVoiceDimensions(profile),
    sentenceLength: profile.sentenceLength ?? null,
    formality: profile.formality ?? null,
    usesQuestions: profile.usesQuestions ?? false,
    usesLists: profile.usesLists ?? false,
    summary: profile.summary ?? null,
    sampleSignal: getVoiceProfileSampleSignal(profile),
  };
}
