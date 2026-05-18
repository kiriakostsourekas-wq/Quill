import { NextResponse, type NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireRequestUser: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  voiceProfile: {
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
}));

const performanceMocks = vi.hoisted(() => ({
  getRecentPerformanceFeedbackPromptContext: vi.fn(),
}));

const voiceMocks = vi.hoisted(() => ({
  generatePatternBasedVoiceText: vi.fn(),
  scoreVoiceText: vi.fn(),
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
  scoreVoiceText: voiceMocks.scoreVoiceText,
}));

import { POST } from "@/app/api/voice/generate/route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/voice/generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("voice generation feedback context", () => {
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
    performanceMocks.getRecentPerformanceFeedbackPromptContext.mockResolvedValue(
      "Recent outperformed posts:\n- Specific hooks worked (50 likes)."
    );
    voiceMocks.generatePatternBasedVoiceText.mockResolvedValue({ text: "Generated post" });
    voiceMocks.scoreVoiceText.mockResolvedValue({
      score: 82,
      safeToPublish: true,
    });
  });

  it("passes manual performance feedback into generation prompts without updating Voice DNA", async () => {
    const response = await POST(
      jsonRequest({
        mode: "idea",
        input: "Write about better content systems",
        platform: "linkedin",
      })
    );

    await expect(response.text()).resolves.toBe("Generated post");
    expect(response.status).toBe(200);
    expect(performanceMocks.getRecentPerformanceFeedbackPromptContext).toHaveBeenCalledWith(
      "user-1"
    );
    expect(voiceMocks.generatePatternBasedVoiceText).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining("Recent manual performance feedback"),
      })
    );
    expect(voiceMocks.generatePatternBasedVoiceText).toHaveBeenCalledTimes(1);
    expect(prismaMocks.voiceProfile.update).not.toHaveBeenCalled();
    expect(prismaMocks.voiceProfile.upsert).not.toHaveBeenCalled();
  });

  it("makes one bounded internal polish pass when the first draft is below threshold", async () => {
    voiceMocks.generatePatternBasedVoiceText
      .mockResolvedValueOnce({ text: "Initial draft with a generic opening." })
      .mockResolvedValueOnce({ text: "Sharper draft with a concrete opening." });
    voiceMocks.scoreVoiceText
      .mockResolvedValueOnce({ score: 61, safeToPublish: false })
      .mockResolvedValueOnce({ score: 79, safeToPublish: true });

    const response = await POST(
      jsonRequest({
        mode: "idea",
        input: "Write about better content systems",
        platform: "linkedin",
      })
    );

    await expect(response.text()).resolves.toBe("Sharper draft with a concrete opening.");
    expect(voiceMocks.generatePatternBasedVoiceText).toHaveBeenCalledTimes(2);
    expect(voiceMocks.generatePatternBasedVoiceText).toHaveBeenLastCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining("Do not expand it"),
      })
    );
  });

  it("still requires an authenticated user", async () => {
    authMocks.requireRequestUser.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await POST(
      jsonRequest({
        mode: "idea",
        input: "Write about better content systems",
        platform: "linkedin",
      })
    );

    expect(response.status).toBe(401);
    expect(voiceMocks.generatePatternBasedVoiceText).not.toHaveBeenCalled();
  });
});
