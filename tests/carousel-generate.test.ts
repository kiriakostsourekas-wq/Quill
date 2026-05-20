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

const groqMocks = vi.hoisted(() => ({
  create: vi.fn(),
}));

const performanceMocks = vi.hoisted(() => ({
  getRecentPerformanceFeedbackPromptContext: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireRequestUser: authMocks.requireRequestUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    voiceProfile: prismaMocks.voiceProfile,
  },
}));

vi.mock("@/lib/groq", () => ({
  groq: {
    chat: {
      completions: {
        create: groqMocks.create,
      },
    },
  },
}));

vi.mock("@/lib/performance-feedback", () => ({
  getRecentPerformanceFeedbackPromptContext:
    performanceMocks.getRecentPerformanceFeedbackPromptContext,
}));

import { POST } from "@/app/api/carousel/generate/route";
import {
  MAX_CAROUSEL_BODY,
  MAX_CAROUSEL_BULLET,
  MAX_CAROUSEL_HEADLINE,
  MAX_CAROUSEL_SLIDES,
} from "@/lib/carousel";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/carousel/generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function mockModelResponse(content: unknown) {
  groqMocks.create.mockResolvedValue({
    choices: [
      {
        message: {
          content: typeof content === "string" ? content : JSON.stringify(content),
        },
      },
    ],
  });
}

describe("carousel generation route", () => {
  beforeEach(() => {
    authMocks.requireRequestUser.mockResolvedValue({ id: "user-1" });
    prismaMocks.voiceProfile.findUnique.mockResolvedValue({
      userId: "user-1",
      setupSource: "pasted_samples",
      samplePosts: [
        "Strong teams do not need louder process. They need clearer ownership and fewer ambiguous handoffs.",
        "Good writing earns trust by making one practical claim and proving it with specific examples.",
      ],
      traits: ["Claim-led hooks", "Practical framing"],
      dimensions: null,
      sentenceLength: "medium",
      formality: "neutral",
      usesQuestions: false,
      usesLists: false,
      summary: "Clear, practical, claim-led writing.",
    });
    performanceMocks.getRecentPerformanceFeedbackPromptContext.mockResolvedValue(null);
  });

  it("requires a session user", async () => {
    authMocks.requireRequestUser.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await POST(jsonRequest({ sourceText: "A useful draft.", slideCount: 3 }));

    expect(response.status).toBe(401);
    expect(groqMocks.create).not.toHaveBeenCalled();
  });

  it("requires an existing Voice DNA profile", async () => {
    prismaMocks.voiceProfile.findUnique.mockResolvedValue(null);

    const response = await POST(jsonRequest({ sourceText: "A useful draft.", slideCount: 3 }));

    await expect(response.json()).resolves.toEqual({ error: "Set up your Voice DNA first" });
    expect(response.status).toBe(400);
    expect(groqMocks.create).not.toHaveBeenCalled();
  });

  it("rejects invalid input and slide counts outside limits", async () => {
    const emptyResponse = await POST(jsonRequest({ sourceText: "", slideCount: 3 }));
    const tooManyResponse = await POST(
      jsonRequest({ sourceText: "A useful draft.", slideCount: MAX_CAROUSEL_SLIDES + 1 })
    );

    expect(emptyResponse.status).toBe(400);
    expect(tooManyResponse.status).toBe(400);
    expect(groqMocks.create).not.toHaveBeenCalled();
  });

  it("returns generated slides in the builder slide shape", async () => {
    mockModelResponse({
      title: "Clearer Systems",
      slides: [
        { headline: "Start with ownership", body: "Clear handoffs make decisions easier." },
        { headline: "Reduce interpretation", body: "A useful process removes guesswork." },
        { headline: "Keep judgment", body: "Structure should support judgment, not replace it." },
      ],
    });

    const response = await POST(jsonRequest({ sourceText: "A useful draft.", slideCount: 3 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      title: "Clearer Systems",
      recommendedTemplateId: "classic",
      templateId: "classic",
      firstComment: null,
      slides: [
        {
          headline: "Start with ownership",
          body: "Clear handoffs make decisions easier.",
          background: "white",
          imageDataUrl: null,
          role: "cover",
          kicker: "",
          emphasis: "",
          bullets: [],
        },
        {
          headline: "Reduce interpretation",
          body: "A useful process removes guesswork.",
          background: "white",
          imageDataUrl: null,
          role: "insight",
          kicker: "",
          emphasis: "",
          bullets: [],
        },
        {
          headline: "Keep judgment",
          body: "Structure should support judgment, not replace it.",
          background: "white",
          imageDataUrl: null,
          role: "cta",
          kicker: "",
          emphasis: "",
          bullets: [],
        },
      ],
    });
  });

  it("returns structured slides with template, roles, bullets, and first comment", async () => {
    mockModelResponse({
      title: "Operating System",
      recommendedTemplateId: "playbook-checklist",
      firstComment: "Save this before your next planning meeting.",
      slides: [
        {
          role: "cover",
          kicker: "Playbook",
          headline: "Make work easier to start",
          body: "Teams move faster when the next action is obvious.",
        },
        {
          role: "checklist",
          headline: "Remove ambiguity",
          body: "Define the handoff before work starts.",
          bullets: ["Owner", "Definition of done", "Next decision"],
        },
      ],
    });

    const response = await POST(
      jsonRequest({
        sourceText: "A useful draft.",
        slideCount: 2,
        style: "tactical",
        templateId: "framework",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.templateId).toBe("playbook-checklist");
    expect(data.firstComment).toBe("Save this before your next planning meeting.");
    expect(data.slides[1]).toMatchObject({
      role: "checklist",
      bullets: ["Owner", "Definition of done", "Next decision"],
    });
  });

  it("returns a graceful error for malformed model JSON", async () => {
    mockModelResponse("not json");

    const response = await POST(jsonRequest({ sourceText: "A useful draft.", slideCount: 3 }));

    await expect(response.json()).resolves.toEqual({
      error: "Unable to generate carousel slides right now",
    });
    expect(response.status).toBe(502);
  });

  it("rejects model output with fewer slides than requested", async () => {
    mockModelResponse({
      title: "Too Short",
      slides: [
        { headline: "Only one", body: "This is not enough." },
        { headline: "Only two", body: "Still not enough." },
      ],
    });

    const response = await POST(jsonRequest({ sourceText: "A useful draft.", slideCount: 3 }));

    expect(response.status).toBe(502);
  });

  it("rejects malformed roles and templates from the model", async () => {
    mockModelResponse({
      title: "Bad schema",
      recommendedTemplateId: "not-a-template",
      slides: [
        { role: "unknown", headline: "One", body: "Body" },
        { role: "cta", headline: "Two", body: "Body" },
      ],
    });

    const response = await POST(jsonRequest({ sourceText: "A useful draft.", slideCount: 2 }));

    expect(response.status).toBe(502);
  });

  it("truncates generated headlines and body copy to carousel limits", async () => {
    mockModelResponse({
      title: "Limits",
      slides: [
        { headline: "H".repeat(MAX_CAROUSEL_HEADLINE + 20), body: "B".repeat(MAX_CAROUSEL_BODY + 20) },
        { headline: "Second slide", body: "Short body" },
      ],
    });

    const response = await POST(jsonRequest({ sourceText: "A useful draft.", slideCount: 2 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.slides[0].headline).toHaveLength(MAX_CAROUSEL_HEADLINE);
    expect(data.slides[0].body).toHaveLength(MAX_CAROUSEL_BODY);
  });

  it("truncates generated bullets to carousel limits", async () => {
    mockModelResponse({
      title: "Bullet Limits",
      slides: [
        {
          headline: "Checklist",
          body: "Short body",
          bullets: Array.from({ length: 8 }, () => "B".repeat(MAX_CAROUSEL_BULLET + 20)),
        },
        { headline: "Second slide", body: "Short body" },
      ],
    });

    const response = await POST(jsonRequest({ sourceText: "A useful draft.", slideCount: 2 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.slides[0].bullets).toHaveLength(5);
    expect(data.slides[0].bullets[0]).toHaveLength(MAX_CAROUSEL_BULLET);
  });
});
