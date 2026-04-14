import { randomUUID } from "crypto";
import type { Post, PostDelivery, Prisma, SocialAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFreshLinkedInAccount, postLinkedInComment, postToLinkedIn } from "@/lib/linkedin";
import { getFreshTwitterAccount, postTweet } from "@/lib/twitter";

export const PUBLISH_LEASE_MS = 5 * 60 * 1000;
export const RETRYABLE_DELIVERY_STATUSES = ["pending", "failed"] as const;
export type PublishTrigger = "cron" | "manual" | "internal";

export class PublishConflictError extends Error {
  constructor(message = "Post is already being published") {
    super(message);
    this.name = "PublishConflictError";
  }
}

export class ImmutablePostError extends Error {
  constructor(message = "Post can no longer be edited") {
    super(message);
    this.name = "ImmutablePostError";
  }
}

type ProviderPublishResult = {
  externalPostId: string | null;
  metadata?: Prisma.JsonValue | null;
};

type PostWithRelations = Prisma.PostGetPayload<{
  include: {
    deliveries: true;
    user: {
      include: {
        socialAccounts: true;
      };
    };
  };
}>;

function uniquePlatforms(platforms: string[]) {
  return [...new Set(platforms)];
}

export function hasPublishedDelivery(deliveries: Array<{ status: string }>) {
  return deliveries.some((delivery) => delivery.status === "published");
}

export function hasRemainingUnpublishedDelivery(deliveries: Array<{ status: string }>) {
  return deliveries.some((delivery) => delivery.status !== "published");
}

export function isPostImmutable(post: { status: string; deliveries: Array<{ status: string }> }) {
  return post.status === "publishing" || hasPublishedDelivery(post.deliveries);
}

export async function ensurePostDeliveries(postId: string, platforms: string[]) {
  const normalizedPlatforms = uniquePlatforms(platforms);

  if (normalizedPlatforms.length === 0) return;

  await prisma.postDelivery.createMany({
    data: normalizedPlatforms.map((platform) => ({
      postId,
      platform,
      status: "pending",
    })),
    skipDuplicates: true,
  });
}

export async function syncPostDeliveries(postId: string, platforms: string[]) {
  const normalizedPlatforms = uniquePlatforms(platforms);

  await ensurePostDeliveries(postId, normalizedPlatforms);

  const existing = await prisma.postDelivery.findMany({
    where: { postId },
    select: {
      id: true,
      platform: true,
      status: true,
    },
  });

  const publishedOutsideSelection = existing.find(
    (delivery) =>
      !normalizedPlatforms.includes(delivery.platform) && delivery.status === "published"
  );

  if (publishedOutsideSelection) {
    throw new ImmutablePostError("Published platforms cannot be removed");
  }

  const removableIds = existing
    .filter(
      (delivery) =>
        !normalizedPlatforms.includes(delivery.platform) && delivery.status !== "published"
    )
    .map((delivery) => delivery.id);

  if (removableIds.length > 0) {
    await prisma.postDelivery.deleteMany({
      where: {
        id: {
          in: removableIds,
        },
      },
    });
  }
}

async function loadPost(postId: string) {
  return prisma.post.findUnique({
    where: { id: postId },
    include: {
      deliveries: true,
      user: {
        include: {
          socialAccounts: true,
        },
      },
    },
  });
}

function getSocialAccount(accounts: SocialAccount[], platform: "linkedin" | "twitter") {
  const account = accounts.find((item) => item.platform === platform);
  if (!account) {
    throw new Error(`No ${platform} account connected`);
  }
  return account;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function publishToPlatform(
  post: PostWithRelations,
  platform: string
): Promise<ProviderPublishResult> {
  if (platform === "linkedin") {
    const account = getSocialAccount(post.user.socialAccounts, "linkedin");
    const { accessToken, account: freshAccount } = await getFreshLinkedInAccount(account);

    if (!freshAccount.accountId) {
      throw new Error("LinkedIn author ID is missing");
    }

    return postToLinkedIn(accessToken, post.content, freshAccount.accountId);
  }

  if (platform === "twitter") {
    const account = getSocialAccount(post.user.socialAccounts, "twitter");
    const { accessToken } = await getFreshTwitterAccount(account);
    return postTweet(accessToken, post.content);
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

async function maybePostFirstLinkedInComment(post: PostWithRelations, postUrn: string | null) {
  const firstComment = post.firstComment?.trim();
  if (!firstComment || !postUrn) return;

  try {
    await delay(2000);
    const account = getSocialAccount(post.user.socialAccounts, "linkedin");
    const { accessToken } = await getFreshLinkedInAccount(account);
    await postLinkedInComment(accessToken, postUrn, firstComment);
  } catch (error) {
    console.warn("LinkedIn first comment failed", {
      postId: post.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function claimPostForPublishing(
  postId: string,
  ownerUserId?: string
): Promise<{ claimId: string; post: PostWithRelations }> {
  const existing = await loadPost(postId);

  if (!existing) {
    throw new Error("Post not found");
  }

  if (ownerUserId && existing.userId !== ownerUserId) {
    throw new Error("Unauthorized");
  }

  await ensurePostDeliveries(existing.id, existing.platforms);

  const now = new Date();
  const claimId = randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + PUBLISH_LEASE_MS);

  const claim = await prisma.post.updateMany({
    where: {
      id: postId,
      ...(ownerUserId ? { userId: ownerUserId } : {}),
      OR: [
        {
          status: {
            in: ["draft", "scheduled", "failed"],
          },
        },
        {
          status: "publishing",
          OR: [
            { publishLeaseExpiresAt: null },
            { publishLeaseExpiresAt: { lt: now } },
          ],
        },
      ],
    },
    data: {
      status: "publishing",
      publishLeaseId: claimId,
      publishLeaseExpiresAt: leaseExpiresAt,
      errorLog: null,
    },
  });

  if (claim.count === 0) {
    const current = await loadPost(postId);

    if (!current) {
      throw new Error("Post not found");
    }

    if (ownerUserId && current.userId !== ownerUserId) {
      throw new Error("Unauthorized");
    }

    if (current.status === "published") {
      throw new ImmutablePostError("Post already published");
    }

    if (
      current.status === "publishing" &&
      current.publishLeaseExpiresAt &&
      current.publishLeaseExpiresAt.getTime() >= now.getTime()
    ) {
      throw new PublishConflictError();
    }

    throw new PublishConflictError("Post could not be claimed for publishing");
  }

  if (existing.status === "publishing") {
    await prisma.postDelivery.updateMany({
      where: {
        postId,
        status: "publishing",
      },
      data: {
        status: "failed",
        errorLog: "Previous publish attempt expired before completion",
      },
    });
  }

  const claimed = await loadPost(postId);
  if (!claimed) {
    throw new Error("Post not found");
  }

  return {
    claimId,
    post: claimed,
  };
}

async function markAttemptStarted(
  delivery: Pick<PostDelivery, "id" | "postId" | "platform">,
  trigger: PublishTrigger,
  claimId: string
) {
  return prisma.$transaction(async (tx) => {
    await tx.postDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "publishing",
        lastAttemptAt: new Date(),
        attemptCount: {
          increment: 1,
        },
        errorLog: null,
      },
    });

    return tx.postPublishAttempt.create({
      data: {
        postId: delivery.postId,
        platform: delivery.platform,
        trigger,
        claimId,
        status: "started",
      },
    });
  });
}

async function markAttemptSucceeded(
  delivery: Pick<PostDelivery, "id">,
  attemptId: string,
  externalPostId: string | null,
  metadata?: Prisma.JsonValue | null
) {
  await prisma.$transaction(async (tx) => {
    await tx.postDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "published",
        externalPostId,
        metadata: metadata ?? undefined,
        publishedAt: new Date(),
        errorLog: null,
      },
    });

    await tx.postPublishAttempt.update({
      where: { id: attemptId },
      data: {
        status: "succeeded",
        completedAt: new Date(),
      },
    });
  });
}

async function markAttemptFailed(
  delivery: Pick<PostDelivery, "id">,
  attemptId: string,
  message: string
) {
  await prisma.$transaction(async (tx) => {
    await tx.postDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "failed",
        errorLog: message,
      },
    });

    await tx.postPublishAttempt.update({
      where: { id: attemptId },
      data: {
        status: "failed",
        errorLog: message,
        completedAt: new Date(),
      },
    });
  });
}

function summarizeDeliveryFailure(post: PostWithRelations) {
  const failedPlatforms = post.deliveries
    .filter(
      (delivery) =>
        post.platforms.includes(delivery.platform) && delivery.status !== "published"
    )
    .map((delivery) => delivery.platform);

  if (failedPlatforms.length === 0) {
    return null;
  }

  return `Publishing incomplete for ${failedPlatforms.join(", ")}`;
}

async function finalizePostPublish(
  postId: string,
  claimId: string
): Promise<PostWithRelations> {
  const post = await loadPost(postId);

  if (!post) {
    throw new Error("Post not found");
  }

  const relevantDeliveries = post.deliveries.filter((delivery) =>
    post.platforms.includes(delivery.platform)
  );

  const allPublished =
    relevantDeliveries.length > 0 &&
    relevantDeliveries.every((delivery) => delivery.status === "published");

  await prisma.post.updateMany({
    where: {
      id: post.id,
      publishLeaseId: claimId,
    },
    data: {
      status: allPublished ? "published" : "failed",
      publishedAt: allPublished ? new Date() : null,
      publishLeaseId: null,
      publishLeaseExpiresAt: null,
      errorLog: allPublished ? null : summarizeDeliveryFailure(post),
    },
  });

  const finalized = await loadPost(postId);
  if (!finalized) {
    throw new Error("Post not found");
  }

  return finalized;
}

export async function claimAndPublishPost(
  postId: string,
  trigger: PublishTrigger,
  ownerUserId?: string
): Promise<Post> {
  const { claimId, post } = await claimPostForPublishing(postId, ownerUserId);
  const retryable = post.deliveries.filter((delivery) =>
    post.platforms.includes(delivery.platform) &&
    RETRYABLE_DELIVERY_STATUSES.includes(
      delivery.status as (typeof RETRYABLE_DELIVERY_STATUSES)[number]
    )
  );

  for (const delivery of retryable) {
    const attempt = await markAttemptStarted(delivery, trigger, claimId);

    try {
      const result = await publishToPlatform(post, delivery.platform);
      await markAttemptSucceeded(
        delivery,
        attempt.id,
        result.externalPostId,
        result.metadata ?? null
      );
      if (delivery.platform === "linkedin") {
        await maybePostFirstLinkedInComment(post, result.externalPostId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publishing failed";
      await markAttemptFailed(delivery, attempt.id, message);
    }
  }

  const finalized = await finalizePostPublish(post.id, claimId);
  return finalized;
}
