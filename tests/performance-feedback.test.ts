import { NextResponse, type NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireRequestUser: vi.fn(),
}));

const prismaMocks = vi.hoisted(() => ({
  post: {
    findFirst: vi.fn(),
  },
  postPerformanceFeedback: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireRequestUser: authMocks.requireRequestUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: prismaMocks.post,
    postPerformanceFeedback: prismaMocks.postPerformanceFeedback,
  },
}));

import { POST } from "@/app/api/performance-feedback/route";
import { buildPerformanceFeedbackPromptContext } from "@/lib/performance-feedback";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/performance-feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("performance feedback route", () => {
  beforeEach(() => {
    authMocks.requireRequestUser.mockResolvedValue({ id: "user-1" });
    prismaMocks.post.findFirst.mockResolvedValue({
      id: "post-1",
      status: "published",
      deliveries: [],
    });
    prismaMocks.postPerformanceFeedback.upsert.mockResolvedValue({
      id: "feedback-1",
      postId: "post-1",
      outcome: "outperformed",
      likes: 10,
      comments: 2,
      reposts: null,
      impressions: 1000,
      notes: "Strong hook worked.",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      updatedAt: new Date("2026-05-02T00:00:00.000Z"),
    });
  });

  it("requires a session user", async () => {
    authMocks.requireRequestUser.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await POST(
      jsonRequest({ postId: "post-1", outcome: "expected" })
    );

    expect(response.status).toBe(401);
    expect(prismaMocks.post.findFirst).not.toHaveBeenCalled();
  });

  it("creates or updates feedback for a published post owned by the user", async () => {
    const response = await POST(
      jsonRequest({
        postId: "post-1",
        outcome: "outperformed",
        likes: 10,
        comments: 2,
        impressions: 1000,
        notes: "Strong hook worked.",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.feedback.outcome).toBe("outperformed");
    expect(prismaMocks.post.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "post-1",
          userId: "user-1",
        },
      })
    );
    expect(prismaMocks.postPerformanceFeedback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { postId: "post-1" },
        update: expect.objectContaining({
          outcome: "outperformed",
          likes: 10,
          comments: 2,
          reposts: null,
          impressions: 1000,
          notes: "Strong hook worked.",
        }),
        create: expect.objectContaining({
          postId: "post-1",
          userId: "user-1",
          outcome: "outperformed",
        }),
      })
    );
  });

  it("rejects feedback for another user's post", async () => {
    prismaMocks.post.findFirst.mockResolvedValue(null);

    const response = await POST(
      jsonRequest({ postId: "post-1", outcome: "expected" })
    );

    await expect(response.json()).resolves.toEqual({ error: "Post not found" });
    expect(response.status).toBe(404);
    expect(prismaMocks.postPerformanceFeedback.upsert).not.toHaveBeenCalled();
  });

  it("enforces the published-only constraint", async () => {
    prismaMocks.post.findFirst.mockResolvedValue({
      id: "post-1",
      status: "draft",
      deliveries: [],
    });

    const response = await POST(
      jsonRequest({ postId: "post-1", outcome: "expected" })
    );

    await expect(response.json()).resolves.toEqual({
      error: "Performance can only be logged for published posts",
    });
    expect(response.status).toBe(409);
    expect(prismaMocks.postPerformanceFeedback.upsert).not.toHaveBeenCalled();
  });

  it("accepts a partially published post with a published delivery", async () => {
    prismaMocks.post.findFirst.mockResolvedValue({
      id: "post-1",
      status: "failed",
      deliveries: [{ id: "delivery-1" }],
    });

    const response = await POST(
      jsonRequest({ postId: "post-1", outcome: "underperformed" })
    );

    expect(response.status).toBe(200);
    expect(prismaMocks.postPerformanceFeedback.upsert).toHaveBeenCalled();
  });

  it("validates outcomes, metric limits, and note length", async () => {
    const invalidOutcome = await POST(
      jsonRequest({ postId: "post-1", outcome: "great" })
    );
    const invalidMetric = await POST(
      jsonRequest({ postId: "post-1", outcome: "expected", likes: -1 })
    );
    const invalidNotes = await POST(
      jsonRequest({ postId: "post-1", outcome: "expected", notes: "x".repeat(1001) })
    );

    expect(invalidOutcome.status).toBe(400);
    expect(invalidMetric.status).toBe(400);
    expect(invalidNotes.status).toBe(400);
  });
});

describe("performance feedback prompt context", () => {
  it("summarizes high and low performing posts without mutating Voice DNA", () => {
    const summary = buildPerformanceFeedbackPromptContext([
      {
        outcome: "outperformed",
        likes: 50,
        comments: 6,
        reposts: null,
        impressions: 5000,
        notes: "The concrete hook got replies.",
        post: {
          postType: "text",
          content: "Specific hooks make feedback easier to interpret.",
          documentTitle: null,
        },
      },
      {
        outcome: "underperformed",
        likes: 2,
        comments: 0,
        reposts: 0,
        impressions: null,
        notes: "Too abstract.",
        post: {
          postType: "text",
          content: "Systems matter for teams.",
          documentTitle: null,
        },
      },
    ]);

    expect(summary).toContain("Recent outperformed posts");
    expect(summary).toContain("50 likes");
    expect(summary).toContain("The concrete hook got replies.");
    expect(summary).toContain("Recent underperformed posts");
    expect(summary).toContain("Too abstract.");
  });
});
