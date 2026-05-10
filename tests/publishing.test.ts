import { beforeEach, describe, expect, it, vi } from "vitest";

const dbHarness = vi.hoisted(() => {
  const state = {
    post: null as any,
    deliveries: [] as any[],
    attempts: [] as any[],
    nextAttempt: 1,
  };

  const clone = <T>(value: T): T => {
    if (value instanceof Date) return new Date(value) as T;
    if (Array.isArray(value)) return value.map((item) => clone(item)) as T;
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, clone(nested)])
      ) as T;
    }
    return value;
  };

  const applyData = (target: any, data: Record<string, any>) => {
    for (const [key, value] of Object.entries(data)) {
      if (key === "attemptCount" && value?.increment) {
        target.attemptCount = (target.attemptCount ?? 0) + value.increment;
      } else {
        target[key] = value;
      }
    }
  };

  const materializePost = () => {
    if (!state.post) return null;
    return clone({
      ...state.post,
      deliveries: state.deliveries,
    });
  };

  const claimAllowed = (where: Record<string, any>) => {
    if (!state.post || state.post.id !== where.id) return false;
    if (where.userId && state.post.userId !== where.userId) return false;

    if (state.post.status === "publishing") {
      return (
        !state.post.publishLeaseExpiresAt ||
        state.post.publishLeaseExpiresAt.getTime() < Date.now()
      );
    }

    return ["draft", "scheduled", "failed"].includes(state.post.status);
  };

  const prisma: any = {};

  prisma.post = {
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
      if (!state.post || state.post.id !== where.id) return null;
      return materializePost();
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Record<string, any>; data: any }) => {
      if (!state.post || state.post.id !== where.id) return { count: 0 };

      if (data.status === "publishing") {
        if (!claimAllowed(where)) return { count: 0 };
        applyData(state.post, data);
        return { count: 1 };
      }

      if (where.publishLeaseId && state.post.publishLeaseId !== where.publishLeaseId) {
        return { count: 0 };
      }

      applyData(state.post, data);
      return { count: 1 };
    }),
  };

  prisma.postDelivery = {
    createMany: vi.fn(async ({ data }: { data: any[] }) => {
      for (const item of data) {
        const exists = state.deliveries.some(
          (delivery) =>
            delivery.postId === item.postId && delivery.platform === item.platform
        );
        if (!exists) {
          state.deliveries.push({
            id: `${item.postId}-${item.platform}`,
            attemptCount: 0,
            ...item,
          });
        }
      }
      return { count: data.length };
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Record<string, any>; data: any }) => {
      let count = 0;
      for (const delivery of state.deliveries) {
        if (where.postId && delivery.postId !== where.postId) continue;
        if (where.status && delivery.status !== where.status) continue;
        applyData(delivery, data);
        count += 1;
      }
      return { count };
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
      const delivery = state.deliveries.find((item) => item.id === where.id);
      if (!delivery) throw new Error(`Delivery not found: ${where.id}`);
      applyData(delivery, data);
      return clone(delivery);
    }),
  };

  prisma.postPublishAttempt = {
    create: vi.fn(async ({ data }: { data: any }) => {
      const attempt = {
        id: `attempt-${state.nextAttempt++}`,
        createdAt: new Date(),
        ...data,
      };
      state.attempts.push(attempt);
      return clone(attempt);
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
      const attempt = state.attempts.find((item) => item.id === where.id);
      if (!attempt) throw new Error(`Attempt not found: ${where.id}`);
      applyData(attempt, data);
      return clone(attempt);
    }),
  };

  prisma.$transaction = vi.fn(async (callback: (tx: any) => Promise<unknown>) =>
    callback(prisma)
  );

  return {
    prisma,
    state,
    reset() {
      state.post = null;
      state.deliveries = [];
      state.attempts = [];
      state.nextAttempt = 1;
    },
  };
});

const providerMocks = vi.hoisted(() => ({
  getFreshLinkedInAccount: vi.fn(),
  postLinkedInComment: vi.fn(),
  postToLinkedIn: vi.fn(),
  getFreshTwitterAccount: vi.fn(),
  postTweet: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: dbHarness.prisma,
}));

vi.mock("@/lib/linkedin", () => ({
  getFreshLinkedInAccount: providerMocks.getFreshLinkedInAccount,
  postLinkedInComment: providerMocks.postLinkedInComment,
  postToLinkedIn: providerMocks.postToLinkedIn,
}));

vi.mock("@/lib/twitter", () => ({
  getFreshTwitterAccount: providerMocks.getFreshTwitterAccount,
  postTweet: providerMocks.postTweet,
}));

import { PublishConflictError, claimAndPublishPost } from "@/lib/publishing";

function seedPost({
  status,
  platforms,
  deliveryStatuses,
  publishLeaseExpiresAt = null,
}: {
  status: string;
  platforms: string[];
  deliveryStatuses: Record<string, string>;
  publishLeaseExpiresAt?: Date | null;
}) {
  dbHarness.state.post = {
    id: "post-1",
    userId: "user-1",
    postType: "text",
    content: "Test post content",
    firstComment: null,
    platforms,
    status,
    scheduledAt: null,
    publishedAt: null,
    errorLog: null,
    publishLeaseId: status === "publishing" ? "existing-lease" : null,
    publishLeaseExpiresAt,
    user: {
      id: "user-1",
      socialAccounts: [
        {
          id: "linkedin-account",
          platform: "linkedin",
          accessToken: "linkedin-token",
          refreshToken: null,
          expiresAt: null,
          accountId: "urn:li:person:123",
        },
        {
          id: "twitter-account",
          platform: "twitter",
          accessToken: "twitter-token",
          refreshToken: null,
          expiresAt: null,
          accountId: "twitter-123",
        },
      ],
    },
  };

  dbHarness.state.deliveries = platforms.map((platform) => ({
    id: `post-1-${platform}`,
    postId: "post-1",
    platform,
    status: deliveryStatuses[platform] ?? "pending",
    externalPostId: null,
    metadata: null,
    publishedAt: null,
    errorLog: null,
    attemptCount: 0,
    lastAttemptAt: null,
  }));
}

function delivery(platform: string) {
  const record = dbHarness.state.deliveries.find((item) => item.platform === platform);
  if (!record) throw new Error(`Missing delivery: ${platform}`);
  return record;
}

describe("claimAndPublishPost", () => {
  beforeEach(() => {
    dbHarness.reset();
    providerMocks.getFreshLinkedInAccount.mockImplementation(async (account) => ({
      accessToken: "fresh-linkedin-token",
      account,
    }));
    providerMocks.getFreshTwitterAccount.mockImplementation(async (account) => ({
      accessToken: "fresh-twitter-token",
      account,
    }));
  });

  it("marks the post failed when one platform fails while keeping successful delivery published", async () => {
    seedPost({
      status: "scheduled",
      platforms: ["linkedin", "twitter"],
      deliveryStatuses: { linkedin: "pending", twitter: "pending" },
    });
    providerMocks.postToLinkedIn.mockResolvedValue({
      externalPostId: "urn:li:share:1",
    });
    providerMocks.postTweet.mockRejectedValue(new Error("Twitter unavailable"));

    const result = await claimAndPublishPost("post-1", "cron");

    expect(result.status).toBe("failed");
    expect(dbHarness.state.post.errorLog).toBe("Publishing incomplete for twitter");
    expect(delivery("linkedin")).toMatchObject({
      status: "published",
      externalPostId: "urn:li:share:1",
      errorLog: null,
    });
    expect(delivery("twitter")).toMatchObject({
      status: "failed",
      errorLog: "Twitter unavailable",
    });
  });

  it("only retries failed or pending deliveries", async () => {
    seedPost({
      status: "failed",
      platforms: ["linkedin", "twitter"],
      deliveryStatuses: { linkedin: "published", twitter: "failed" },
    });
    providerMocks.postTweet.mockResolvedValue({
      externalPostId: "tweet-1",
      metadata: { tweetIds: ["tweet-1"], threaded: false },
    });

    const result = await claimAndPublishPost("post-1", "manual", "user-1");

    expect(result.status).toBe("published");
    expect(providerMocks.postToLinkedIn).not.toHaveBeenCalled();
    expect(providerMocks.postTweet).toHaveBeenCalledTimes(1);
    expect(delivery("linkedin").attemptCount).toBe(0);
    expect(delivery("twitter")).toMatchObject({
      status: "published",
      externalPostId: "tweet-1",
      attemptCount: 1,
    });
  });

  it("rejects active lease conflicts", async () => {
    seedPost({
      status: "publishing",
      platforms: ["twitter"],
      deliveryStatuses: { twitter: "publishing" },
      publishLeaseExpiresAt: new Date(Date.now() + 60_000),
    });

    await expect(claimAndPublishPost("post-1", "cron")).rejects.toBeInstanceOf(
      PublishConflictError
    );
    expect(providerMocks.postTweet).not.toHaveBeenCalled();
    expect(delivery("twitter").status).toBe("publishing");
  });

  it("recovers an expired lease and republishes the stale publishing delivery", async () => {
    seedPost({
      status: "publishing",
      platforms: ["twitter"],
      deliveryStatuses: { twitter: "publishing" },
      publishLeaseExpiresAt: new Date(Date.now() - 60_000),
    });
    providerMocks.postTweet.mockResolvedValue({
      externalPostId: "tweet-1",
      metadata: { tweetIds: ["tweet-1"], threaded: false },
    });

    const result = await claimAndPublishPost("post-1", "cron");

    expect(result.status).toBe("published");
    expect(providerMocks.postTweet).toHaveBeenCalledTimes(1);
    expect(delivery("twitter")).toMatchObject({
      status: "published",
      externalPostId: "tweet-1",
      attemptCount: 1,
      errorLog: null,
    });
    expect(dbHarness.state.attempts[0]).toMatchObject({
      platform: "twitter",
      trigger: "cron",
      status: "succeeded",
    });
  });
});
