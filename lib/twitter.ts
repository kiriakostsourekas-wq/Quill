import { createHash, randomBytes } from "crypto";
import type { Prisma, SocialAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/encrypt";
import { safeJson } from "@/lib/utils";

const TOKEN_REFRESH_WINDOW_MS = 10 * 60 * 1000;

function baseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function assertTwitterAuthConfig() {
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  }

  if (!process.env.TWITTER_CLIENT_ID) {
    throw new Error("TWITTER_CLIENT_ID is not configured");
  }

  if (!process.env.TWITTER_CLIENT_SECRET) {
    throw new Error("TWITTER_CLIENT_SECRET is not configured");
  }
}

function toBase64Url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createTwitterPkcePair() {
  const verifier = toBase64Url(randomBytes(32));
  const challenge = toBase64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function getTwitterAuthUrl(state = randomBytes(16).toString("hex")) {
  assertTwitterAuthConfig();
  const { verifier, challenge } = createTwitterPkcePair();
  const url = new URL("https://twitter.com/i/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.TWITTER_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", `${baseUrl()}/api/auth/twitter/callback`);
  url.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return {
    url: url.toString(),
    verifier,
  };
}

export async function exchangeTwitterCode(code: string, verifier: string) {
  assertTwitterAuthConfig();
  const clientId = process.env.TWITTER_CLIENT_ID ?? "";
  const clientSecret = process.env.TWITTER_CLIENT_SECRET ?? "";
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: `${baseUrl()}/api/auth/twitter/callback`,
    code_verifier: verifier,
  });

  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to exchange Twitter authorization code (${response.status}): ${details || "no response body"}`
    );
  }

  return safeJson<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }>(response);
}

export async function refreshTwitterToken(refreshToken: string) {
  assertTwitterAuthConfig();
  const clientId = process.env.TWITTER_CLIENT_ID ?? "";
  const clientSecret = process.env.TWITTER_CLIENT_SECRET ?? "";
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to refresh Twitter token (${response.status}): ${details || "no response body"}`
    );
  }

  return safeJson<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }>(response);
}

export async function getFreshTwitterAccount(account: SocialAccount) {
  const refreshToken = account.refreshToken ? decrypt(account.refreshToken) : null;
  const expiresSoon =
    !!account.expiresAt &&
    account.expiresAt.getTime() - Date.now() < TOKEN_REFRESH_WINDOW_MS;

  if (!expiresSoon || !refreshToken) {
    return {
      accessToken: decrypt(account.accessToken),
      account,
    };
  }

  try {
    const refreshed = await refreshTwitterToken(refreshToken);
    const updated = await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        accessToken: encrypt(refreshed.access_token),
        refreshToken: refreshed.refresh_token
          ? encrypt(refreshed.refresh_token)
          : account.refreshToken,
        expiresAt: refreshed.expires_in
          ? new Date(Date.now() + refreshed.expires_in * 1000)
          : account.expiresAt,
      },
    });

    return {
      accessToken: decrypt(updated.accessToken),
      account: updated,
    };
  } catch (error) {
    console.warn("Twitter token refresh failed", {
      accountId: account.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      accessToken: decrypt(account.accessToken),
      account,
    };
  }
}

function splitLongSentence(sentence: string, limit: number) {
  const words = sentence.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= limit) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
    }
    current = word;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function splitIntoThread(text: string, limit = 280) {
  if (text.length <= limit) {
    return [text];
  }

  const sentences = Array.from(text.matchAll(/[^.!?\n]+(?:[.!?]+|$)/g))
    .map((match) => (match[0] ?? "").trim())
    .filter(Boolean);

  const source = sentences.length > 0 ? sentences : [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of source) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length <= limit) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (sentence.length <= limit) {
      current = sentence;
      continue;
    }

    const longChunks = splitLongSentence(sentence, limit);
    for (const longChunk of longChunks) {
      if (longChunk.length <= limit) {
        chunks.push(longChunk);
      }
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.filter(Boolean);
}

async function createTweet(
  accessToken: string,
  text: string,
  inReplyToTweetId?: string
) {
  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      ...(inReplyToTweetId
        ? {
            reply: {
              in_reply_to_tweet_id: inReplyToTweetId,
            },
          }
        : {}),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Twitter publish failed (${response.status}): ${details || "no response body"}`
    );
  }

  const result = await safeJson<{ data?: { id?: string } }>(response);
  if (!result.data?.id) {
    throw new Error("Twitter publish failed: response did not include a tweet id");
  }

  return result.data.id;
}

export async function postTweet(
  accessToken: string,
  text: string
): Promise<{ externalPostId: string | null; metadata: Prisma.JsonObject }> {
  const chunks = splitIntoThread(text);
  const tweetIds: string[] = [];
  let previousTweetId: string | undefined;

  for (const chunk of chunks) {
    const tweetId = await createTweet(accessToken, chunk, previousTweetId);
    if (tweetId) {
      tweetIds.push(tweetId);
      previousTweetId = tweetId;
    }
  }

  return {
    externalPostId: tweetIds[0] ?? null,
    metadata: {
      tweetIds,
      threaded: tweetIds.length > 1,
    },
  };
}
