import { prisma } from "@/lib/prisma";

type PerformanceFeedbackPromptRecord = {
  outcome: string;
  likes: number | null;
  comments: number | null;
  reposts: number | null;
  impressions: number | null;
  notes: string | null;
  post: {
    postType: string;
    content: string;
    documentTitle: string | null;
  };
};

function truncateForPrompt(value: string, maxLength = 220) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function formatMetrics(record: PerformanceFeedbackPromptRecord) {
  const metrics = [
    record.likes == null ? null : `${record.likes} likes`,
    record.comments == null ? null : `${record.comments} comments`,
    record.reposts == null ? null : `${record.reposts} reposts`,
    record.impressions == null ? null : `${record.impressions} impressions`,
  ].filter(Boolean);

  return metrics.length > 0 ? ` (${metrics.join(", ")})` : "";
}

function formatRecord(record: PerformanceFeedbackPromptRecord) {
  const title =
    record.post.postType === "carousel" && record.post.documentTitle
      ? record.post.documentTitle
      : truncateForPrompt(record.post.content, 140);
  const notes = record.notes ? ` Notes: ${truncateForPrompt(record.notes, 160)}` : "";

  return `- ${title}${formatMetrics(record)}.${notes}`;
}

export function buildPerformanceFeedbackPromptContext(
  records: PerformanceFeedbackPromptRecord[]
) {
  const outperformed = records.filter((record) => record.outcome === "outperformed");
  const underperformed = records.filter((record) => record.outcome === "underperformed");
  const expected = records.filter((record) => record.outcome === "expected");
  const sections = [
    outperformed.length > 0
      ? `Recent outperformed posts:\n${outperformed.slice(0, 4).map(formatRecord).join("\n")}`
      : null,
    underperformed.length > 0
      ? `Recent underperformed posts:\n${underperformed.slice(0, 4).map(formatRecord).join("\n")}`
      : null,
    expected.length > 0
      ? `Recent expected posts:\n${expected.slice(0, 3).map(formatRecord).join("\n")}`
      : null,
  ].filter(Boolean);

  return sections.length > 0 ? sections.join("\n\n") : null;
}

export async function getRecentPerformanceFeedbackPromptContext(userId: string) {
  const records = await prisma.postPerformanceFeedback.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 12,
    select: {
      outcome: true,
      likes: true,
      comments: true,
      reposts: true,
      impressions: true,
      notes: true,
      post: {
        select: {
          postType: true,
          content: true,
          documentTitle: true,
        },
      },
    },
  });

  return buildPerformanceFeedbackPromptContext(records);
}
