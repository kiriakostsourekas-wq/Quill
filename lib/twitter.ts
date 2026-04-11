import { createHash, randomBytes } from "crypto";
import type { SocialAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/encrypt";
import { safeJson } from "@/lib/utils";

function baseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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

export function getTwitterAuthUrl(
  state = randomBytes(16).toString("hex"),
  challenge = ""
) {
  const url = new URL("https://twitter.com/i/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.TWITTER_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", `${baseUrl()}/api/auth/twitter/callback`);
  url.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeTwitterCode(code: string, verifier: string) {
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
    throw new Error("Failed to exchange Twitter authorization code");
  }

  return safeJson<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }>(response);
}

export async function refreshTwitterToken(refreshToken: string) {
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
    throw new Error("Failed to refresh Twitter token");
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
    account.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if (!expiresSoon || !refreshToken) {
    return {
      accessToken: decrypt(account.accessToken),
      account,
    };
  }

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
}

export async function postTweet(accessToken: string, text: string) {
  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error("Twitter publish failed");
  }

  return safeJson(response);
}
