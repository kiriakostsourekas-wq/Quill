import type { Post, Prisma, SocialAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFreshLinkedInAccount, postToLinkedIn } from "@/lib/linkedin";
import { getFreshTwitterAccount, postTweet } from "@/lib/twitter";

type PostWithAccounts = Prisma.PostGetPayload<{
  include: {
    user: {
      include: {
        socialAccounts: true;
      };
    };
  };
}>;

function getSocialAccount(accounts: SocialAccount[], platform: "linkedin" | "twitter") {
  const account = accounts.find((item) => item.platform === platform);
  if (!account) {
    throw new Error(`No ${platform} account connected`);
  }
  return account;
}

async function publishToPlatform(post: PostWithAccounts, platform: string) {
  if (platform === "linkedin") {
    const account = getSocialAccount(post.user.socialAccounts, "linkedin");
    const { accessToken, account: freshAccount } = await getFreshLinkedInAccount(account);

    if (!freshAccount.accountId) {
      throw new Error("LinkedIn author ID is missing");
    }

    await postToLinkedIn(accessToken, post.content, freshAccount.accountId);
    return;
  }

  if (platform === "twitter") {
    const account = getSocialAccount(post.user.socialAccounts, "twitter");
    const { accessToken } = await getFreshTwitterAccount(account);
    await postTweet(accessToken, post.content);
    return;
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

export async function publishPostById(postId: string, ownerUserId?: string): Promise<Post> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: {
        include: {
          socialAccounts: true,
        },
      },
    },
  });

  if (!post) {
    throw new Error("Post not found");
  }

  if (ownerUserId && post.userId !== ownerUserId) {
    throw new Error("Unauthorized");
  }

  try {
    for (const platform of post.platforms) {
      await publishToPlatform(post, platform);
    }

    return prisma.post.update({
      where: { id: post.id },
      data: {
        status: "published",
        publishedAt: new Date(),
        errorLog: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publishing failed";
    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: "failed",
        errorLog: message,
      },
    });
    throw error;
  }
}

