import { randomBytes } from "crypto";
import type { SocialAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/encrypt";
import { safeJson } from "@/lib/utils";

const LINKEDIN_SCOPES = ["openid", "profile", "email", "w_member_social"];
const TOKEN_REFRESH_WINDOW_MS = 10 * 60 * 1000;

function baseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function assertLinkedInAuthConfig() {
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  }

  if (!process.env.LINKEDIN_CLIENT_ID) {
    throw new Error("LINKEDIN_CLIENT_ID is not configured");
  }

  if (!process.env.LINKEDIN_CLIENT_SECRET) {
    throw new Error("LINKEDIN_CLIENT_SECRET is not configured");
  }
}

export function getLinkedInAuthUrl(state = randomBytes(16).toString("hex")) {
  assertLinkedInAuthConfig();
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", `${baseUrl()}/api/auth/linkedin/callback`);
  url.searchParams.set("scope", LINKEDIN_SCOPES.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeLinkedInCode(code: string) {
  assertLinkedInAuthConfig();
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
    const details = await response.text();
    throw new Error(
      `Failed to exchange LinkedIn authorization code (${response.status}): ${details || "no response body"}`
    );
  }

  return safeJson<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_token_expires_in?: number;
  }>(response);
}

export async function refreshLinkedInToken(refreshToken: string) {
  assertLinkedInAuthConfig();
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
    const details = await response.text();
    throw new Error(
      `Failed to refresh LinkedIn token (${response.status}): ${details || "no response body"}`
    );
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
    account.expiresAt.getTime() - Date.now() < TOKEN_REFRESH_WINDOW_MS;

  if (!expiresSoon || !refreshToken) {
    return {
      accessToken: decrypt(account.accessToken),
      account,
    };
  }

  try {
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
  } catch (error) {
    console.warn("LinkedIn token refresh failed", {
      accountId: account.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      accessToken: decrypt(account.accessToken),
      account,
    };
  }
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
    const details = await response.text();
    throw new Error(
      `LinkedIn publish failed (${response.status}): ${details || "no response body"}`
    );
  }

  const rawBody = (await response.text()).trim();
  const externalPostId = extractLinkedInPostUrn(response, rawBody);

  return {
    externalPostId,
  };
}

function extractLinkedInPostUrn(response: Response, rawBody: string) {
  const candidates = [
    response.headers.get("x-linkedin-id"),
    response.headers.get("x-restli-id"),
    response.headers.get("location"),
    rawBody,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const urn = normalizeLinkedInPostUrn(candidate);
    if (urn) {
      return urn;
    }
  }

  return null;
}

function normalizeLinkedInPostUrn(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsedJson = JSON.parse(trimmed) as { id?: string };
    if (parsedJson.id) {
      return normalizeLinkedInPostUrn(parsedJson.id);
    }
  } catch {
    // ignore non-JSON body values
  }

  try {
    const decoded = decodeURIComponent(trimmed);
    const decodedUrn = decoded.match(/urn:li:[A-Za-z]+:\d+/);
    if (decodedUrn) return decodedUrn[0];
  } catch {
    // ignore invalid URI components
  }

  const directUrn = trimmed.match(/urn:li:[A-Za-z]+:\d+/);
  if (directUrn) return directUrn[0];

  return null;
}

export async function postLinkedInComment(
  accessToken: string,
  postUrn: string,
  text: string
): Promise<void> {
  const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!profileResponse.ok) {
    const details = await profileResponse.text();
    throw new Error(
      `LinkedIn comment actor lookup failed (${profileResponse.status}): ${details || "no response body"}`
    );
  }

  const profile = await safeJson<{ sub?: string }>(profileResponse);
  if (!profile.sub) {
    throw new Error("LinkedIn comment actor ID is missing");
  }

  const response = await fetch(
    `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        actor: `urn:li:person:${profile.sub}`,
        message: { text },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LinkedIn comment failed: ${err}`);
  }
}

export async function uploadLinkedInDocument(
  accessToken: string,
  authorUrn: string,
  pdfBytes: Uint8Array,
  title: string
): Promise<string> {
  const registerResponse = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        owner: authorUrn,
        recipes: ["urn:li:digitalmediaRecipe:feedshare-document"],
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
        supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"],
      },
    }),
  });

  if (!registerResponse.ok) {
    const details = await registerResponse.text();
    throw new Error(
      `LinkedIn document register upload failed (${registerResponse.status}): ${details || "no response body"}`
    );
  }

  const registerBody = await safeJson<{
    value?: {
      asset?: string;
      uploadMechanism?: {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"?: {
          uploadUrl?: string;
        };
      };
    };
  }>(registerResponse);

  const assetUrn = registerBody.value?.asset;
  const uploadUrl =
    registerBody.value?.uploadMechanism?.[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ]?.uploadUrl;

  if (!assetUrn || !uploadUrl) {
    throw new Error("LinkedIn document upload registration returned incomplete data");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/pdf",
    },
    body: Uint8Array.from(pdfBytes),
  });

  if (!uploadResponse.ok) {
    const details = await uploadResponse.text();
    throw new Error(
      `LinkedIn document binary upload failed (${uploadResponse.status}): ${details || "no response body"}`
    );
  }

  return assetUrn;
}
