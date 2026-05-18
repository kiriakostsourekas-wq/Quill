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

import { POST } from "@/app/api/carousel/generate/route";
import {
  MAX_CAROUSEL_BODY,
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
      slides: [
        {
          headline: "Start with ownership",
          body: "Clear handoffs make decisions easier.",
          background: "white",
          imageDataUrl: null,
        },
        {
          headline: "Reduce interpretation",
          body: "A useful process removes guesswork.",
          background: "white",
          imageDataUrl: null,
        },
        {
          headline: "Keep judgment",
          body: "Structure should support judgment, not replace it.",
          background: "white",
          imageDataUrl: null,
        },
      ],
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
});
