import { NextResponse, type NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireRequestUser: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  voiceProfile: {
    findUnique: vi.fn(),
  },
}));

const performanceMocks = vi.hoisted(() => ({
  getRecentPerformanceFeedbackPromptContext: vi.fn(),
}));

const voiceMocks = vi.hoisted(() => ({
  generatePatternBasedVoiceText: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireRequestUser: authMocks.requireRequestUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    voiceProfile: prismaMocks.voiceProfile,
  },
}));

vi.mock("@/lib/performance-feedback", () => ({
  getRecentPerformanceFeedbackPromptContext:
    performanceMocks.getRecentPerformanceFeedbackPromptContext,
}));

vi.mock("@/lib/voice-dna", () => ({
  generatePatternBasedVoiceText: voiceMocks.generatePatternBasedVoiceText,
}));

import { POST } from "@/app/api/voice/rewrite/route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/voice/rewrite", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("voice rewrite route", () => {
  beforeEach(() => {
    authMocks.requireRequestUser.mockResolvedValue({ id: "user-1" });
    prismaMocks.voiceProfile.findUnique.mockResolvedValue({
      userId: "user-1",
      setupSource: "pasted_samples",
      samplePosts: [
        "Useful writing starts with a concrete claim and earns trust with examples.",
        "Clear systems reduce interpretation without removing judgment.",
      ],
      traits: ["Claim-led hooks"],
      dimensions: null,
      sentenceLength: "medium",
      formality: "neutral",
      usesQuestions: false,
      usesLists: false,
      summary: "Clear, practical, claim-led writing.",
    });
    performanceMocks.getRecentPerformanceFeedbackPromptContext.mockResolvedValue(null);
    voiceMocks.generatePatternBasedVoiceText.mockResolvedValue({ text: "Rewritten post" });
  });

  it("uses a conservative one-pass rewrite prompt", async () => {
    const response = await POST(jsonRequest({ text: "Original post." }));

    await expect(response.text()).resolves.toBe("Rewritten post");
    expect(response.status).toBe(200);
    expect(voiceMocks.generatePatternBasedVoiceText).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining("do not chase a perfect match"),
        userPrompt: expect.stringContaining("Original length: 14 characters"),
      })
    );
    expect(voiceMocks.generatePatternBasedVoiceText).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining("Do not make the draft longer"),
      })
    );
  });

  it("still requires authentication", async () => {
    authMocks.requireRequestUser.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await POST(jsonRequest({ text: "Original post." }));

    expect(response.status).toBe(401);
    expect(voiceMocks.generatePatternBasedVoiceText).not.toHaveBeenCalled();
  });
});
