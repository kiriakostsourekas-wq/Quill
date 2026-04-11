import { randomBytes } from "crypto";
import type { SocialAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/encrypt";
import { safeJson } from "@/lib/utils";

const LINKEDIN_SCOPES = ["openid", "profile", "email", "w_member_social"];

function baseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getLinkedInAuthUrl(state = randomBytes(16).toString("hex")) {
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID ?? "");
  url.searchParams.set(
    "redirect_uri",
    `${baseUrl()}/api/auth/linkedin/callback`
  );
  url.searchParams.set("scope", LINKEDIN_SCOPES.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeLinkedInCode(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: `${baseUrl()}/api/auth/linkedin/callback`,
    client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
    client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
  });

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error("Failed to exchange LinkedIn authorization code");
  }

  return safeJson<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_token_expires_in?: number;
  }>(response);
}

export async function refreshLinkedInToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
    client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
  });

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error("Failed to refresh LinkedIn token");
  }

  return safeJson<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }>(response);
}

export async function getFreshLinkedInAccount(account: SocialAccount) {
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

  const refreshed = await refreshLinkedInToken(refreshToken);
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

export async function postToLinkedIn(
  accessToken: string,
  text: string,
  authorUrn: string
) {
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  if (!response.ok) {
    throw new Error("LinkedIn publish failed");
  }

  return response.text();
}
