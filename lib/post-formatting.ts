const sentencePattern = /[^.!?\n]+(?:[.!?]+|$)/g;
const listItemPattern = /^\s*(?:[-*+\u2022]\s+|\d+[.)]\s+)/;

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

function cleanLineWhitespace(value: string) {
  return normalizeLineEndings(value)
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function hasIntentionalSpacing(value: string) {
  return /\n\s*\n/.test(value);
}

function splitSentences(value: string) {
  return Array.from(value.matchAll(sentencePattern))
    .map((match) => match[0]?.trim())
    .filter((sentence): sentence is string => Boolean(sentence));
}

function pushBlock(blocks: string[], block: string) {
  const cleaned = block.trim();
  if (cleaned) {
    blocks.push(cleaned);
  }
}

function formatBlock(block: string) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1 && lines.every((line) => listItemPattern.test(line))) {
    return [lines.join("\n")];
  }

  return splitSentences(lines.join(" "));
}

export function formatLinkedInPostSpacing(input: string) {
  const cleaned = cleanLineWhitespace(input);
  if (!cleaned) return "";

  if (hasIntentionalSpacing(cleaned)) {
    return cleaned
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .join("\n\n");
  }

  const blocks: string[] = [];
  let proseBuffer: string[] = [];
  let listBuffer: string[] = [];

  for (const rawLine of cleaned.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    if (listItemPattern.test(line)) {
      pushBlock(blocks, formatBlock(proseBuffer.join(" ")).join("\n\n"));
      proseBuffer = [];
      listBuffer.push(line);
      continue;
    }

    if (listBuffer.length > 0) {
      pushBlock(blocks, listBuffer.join("\n"));
      listBuffer = [];
    }
    proseBuffer.push(line);
  }

  if (listBuffer.length > 0) {
    pushBlock(blocks, listBuffer.join("\n"));
  }
  if (proseBuffer.length > 0) {
    blocks.push(...formatBlock(proseBuffer.join(" ")));
  }

  return blocks.join("\n\n");
}
