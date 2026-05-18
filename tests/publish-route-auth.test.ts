import { NextResponse, type NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  requireRequestUser: vi.fn(),
}));

const publishMocks = vi.hoisted(() => {
  class ImmutablePostError extends Error {}
  class PublishConflictError extends Error {}

  return {
    claimAndPublishPost: vi.fn(),
    hasPublishedDelivery: vi.fn(),
    syncPostDeliveries: vi.fn(),
    ImmutablePostError,
    PublishConflictError,
  };
});

const planMocks = vi.hoisted(() => {
  class PlanLimitError extends Error {}

  return {
    PlanLimitError,
    assertFreePlanPostLimit: vi.fn(),
    assertPlanAllowsPlatforms: vi.fn(),
  };
});

const prismaMocks = vi.hoisted(() => ({
  post: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

const voiceMocks = vi.hoisted(() => ({
  scoreVoiceTextForUser: vi.fn(),
  toStoredVoiceFields: vi.fn(() => ({})),
}));

vi.mock("@/lib/auth", () => ({
  getRequestUser: authMocks.getRequestUser,
  requireRequestUser: authMocks.requireRequestUser,
}));

vi.mock("@/lib/publishing", () => ({
  claimAndPublishPost: publishMocks.claimAndPublishPost,
  hasPublishedDelivery: publishMocks.hasPublishedDelivery,
  syncPostDeliveries: publishMocks.syncPostDeliveries,
  ImmutablePostError: publishMocks.ImmutablePostError,
  PublishConflictError: publishMocks.PublishConflictError,
}));

vi.mock("@/lib/plans", () => ({
  PlanLimitError: planMocks.PlanLimitError,
  assertFreePlanPostLimit: planMocks.assertFreePlanPostLimit,
  assertPlanAllowsPlatforms: planMocks.assertPlanAllowsPlatforms,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: prismaMocks.post,
  },
}));

vi.mock("@/lib/voice-dna", () => ({
  scoreVoiceTextForUser: voiceMocks.scoreVoiceTextForUser,
  toStoredVoiceFields: voiceMocks.toStoredVoiceFields,
}));

import { POST as publishPost } from "@/app/api/publish/route";
import { POST as publishNowPost } from "@/app/api/publish/now/route";

function jsonRequest(path: string, body: unknown, headers: HeadersInit = {}) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("publish route authorization", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "internal-secret";
    publishMocks.claimAndPublishPost.mockResolvedValue({ id: "post-1" });
    publishMocks.syncPostDeliveries.mockResolvedValue(undefined);
    voiceMocks.scoreVoiceTextForUser.mockResolvedValue({ result: {} });
    voiceMocks.toStoredVoiceFields.mockReturnValue({});
  });

  it("rejects manual publish requests without a session", async () => {
    authMocks.getRequestUser.mockResolvedValue(null);

    const response = await publishPost(jsonRequest("/api/publish", { postId: "post-1" }));

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(response.status).toBe(401);
    expect(publishMocks.claimAndPublishPost).not.toHaveBeenCalled();
  });

  it("authorizes manual publish requests with the session user", async () => {
    authMocks.getRequestUser.mockResolvedValue({ id: "user-1" });

    const response = await publishPost(jsonRequest("/api/publish", { postId: "post-1" }));

    expect(response.status).toBe(200);
    expect(publishMocks.claimAndPublishPost).toHaveBeenCalledWith(
      "post-1",
      "manual",
      "user-1"
    );
  });

  it("authorizes internal publish requests with the internal secret", async () => {
    const response = await publishPost(
      jsonRequest("/api/publish", { postId: "post-1" }, {
        "x-quill-internal-secret": "internal-secret",
      })
    );

    expect(response.status).toBe(200);
    expect(authMocks.getRequestUser).not.toHaveBeenCalled();
    expect(publishMocks.claimAndPublishPost).toHaveBeenCalledWith(
      "post-1",
      "internal",
      undefined
    );
  });

  it("does not treat a bad internal secret as internal authorization", async () => {
    authMocks.getRequestUser.mockResolvedValue(null);

    const response = await publishPost(
      jsonRequest("/api/publish", { postId: "post-1" }, {
        "x-quill-internal-secret": "wrong-secret",
      })
    );

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(response.status).toBe(401);
    expect(publishMocks.claimAndPublishPost).not.toHaveBeenCalled();
  });

  it("rejects publish-now requests before publishing when unauthenticated", async () => {
    authMocks.requireRequestUser.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await publishNowPost(
      jsonRequest("/api/publish/now", {
        content: "Hello world",
        platforms: ["twitter"],
      })
    );

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(response.status).toBe(401);
    expect(publishMocks.claimAndPublishPost).not.toHaveBeenCalled();
  });

  it("preserves internal line breaks in publish-now content", async () => {
    const content = "Hook line.\n\nSecond paragraph.\n\nFinal line.";
    authMocks.requireRequestUser.mockResolvedValue({ id: "user-1" });
    prismaMocks.post.create.mockResolvedValue({ id: "post-1" });

    const response = await publishNowPost(
      jsonRequest("/api/publish/now", {
        content,
        platforms: ["linkedin"],
      })
    );

    expect(response.status).toBe(200);
    expect(prismaMocks.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content,
      }),
    });
    expect(publishMocks.claimAndPublishPost).toHaveBeenCalledWith(
      "post-1",
      "manual",
      "user-1"
    );
  });
});
