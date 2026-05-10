export const SAMPLE_MIN_LENGTH = 40;
export const MIN_TOTAL_SIGNAL = 500;
export const NEAR_DUPLICATE_SIMILARITY = 0.82;
export const MIN_UNIQUE_WORD_RATIO = 0.45;

export function normalizeSample(sample: string) {
  return sample.trim().replace(/\s+/g, " ");
}

export function tokenizeVoiceSample(text: string) {
  return normalizeSample(text)
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

export function uniqueWordRatio(text: string) {
  const words = tokenizeVoiceSample(text);
  if (words.length === 0) return 0;
  return new Set(words).size / words.length;
}

export function jaccardSimilarity(left: string, right: string) {
  const leftSet = new Set(tokenizeVoiceSample(left));
  const rightSet = new Set(tokenizeVoiceSample(right));
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

export function stripExactDuplicates(samples: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const sample of samples) {
    const normalized = normalizeSample(sample).toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalizeSample(sample));
  }

  return unique;
}

export function findNearDuplicatePair(samples: string[]) {
  for (let index = 0; index < samples.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < samples.length; otherIndex += 1) {
      if (jaccardSimilarity(samples[index], samples[otherIndex]) >= NEAR_DUPLICATE_SIMILARITY) {
        return [samples[index], samples[otherIndex]] as const;
      }
    }
  }

  return null;
}

export function findLowDiversitySample(samples: string[]) {
  return samples.find((sample) => {
    const words = tokenizeVoiceSample(sample);
    return words.length >= 12 && uniqueWordRatio(sample) < MIN_UNIQUE_WORD_RATIO;
  });
}

export function buildOnboardingVoiceSeed(user: {
  userType?: string | null;
  communicationStyle?: string | null;
  contrarianBelief?: string | null;
}) {
  if (user.userType !== "beginner" && user.userType !== "builder") {
    return null;
  }

  const parts: string[] = [];
  if (user.communicationStyle) {
    parts.push(`The user describes their style as ${user.communicationStyle}.`);
  }
  if (user.contrarianBelief) {
    parts.push(`They believe: '${normalizeSample(user.contrarianBelief)}'.`);
  }

  if (parts.length === 0) {
    return null;
  }

  parts.push("Use this as additional voice signal.");
  return parts.join(" ");
}
