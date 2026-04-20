const ANALYSIS_SAMPLE_LIMIT = 5;

export function normalizeImportedVoicePost(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

export function normalizeImportedVoicePostKey(text: string) {
  return normalizeImportedVoicePost(text).toLowerCase();
}

export function dedupeImportedVoicePosts(posts: string[], existingPosts: string[] = []) {
  const seen = new Set(existingPosts.map((post) => normalizeImportedVoicePostKey(post)));
  const cleaned: string[] = [];

  for (const post of posts) {
    const normalized = normalizeImportedVoicePost(post);
    if (!normalized) continue;

    const key = normalizeImportedVoicePostKey(normalized);
    if (seen.has(key)) continue;

    seen.add(key);
    cleaned.push(normalized);
  }

  return cleaned;
}

export function pickAnalysisSamplePosts(posts: string[]) {
  return posts.slice(-ANALYSIS_SAMPLE_LIMIT);
}

export function buildPlaceholderVoiceProfileFields(samplePosts: string[], excludedPosts: string[]) {
  return {
    setupSource: "linkedin_posts" as const,
    foundationKey: null,
    samplePosts,
    excludedPosts,
    traits: [] as string[],
    sentenceLength: null,
    formality: null,
    usesQuestions: false,
    usesLists: false,
    summary:
      samplePosts.length > 0
        ? "Quill has started collecting your LinkedIn posts. Add a few more to build a stronger Voice DNA profile."
        : null,
  };
}
