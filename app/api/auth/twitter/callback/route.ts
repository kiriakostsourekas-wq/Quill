import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appendSessionCookie } from "@/lib/session";
import { exchangeTwitterCode } from "@/lib/twitter";
import { clearOAuthCookie, readOAuthCookie } from "@/lib/oauth";
import { TWITTER_OAUTH_COOKIE_NAME } from "@/lib/constants";
import { encrypt } from "@/lib/encrypt";
import { safeJson } from "@/lib/utils";

type TwitterStateCookie = {
  state: string;
  verifier: string;
  userId: string | null;
};

type TwitterProfile = {
  data?: {
    id: string;
    name?: string;
    username?: string;
    profile_image_url?: string;
  };
};

function buildFailureRedirect(request: NextRequest, path = "/login?error=twitter_auth") {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

async function resolveAppUser(payload: TwitterStateCookie | null, profile: TwitterProfile["data"]) {
  if (!profile) {
    throw new Error("Twitter profile missing");
  }

  const email = `twitter-${profile.id}@users.quill.local`;
  const name = profile.name ?? profile.username ?? email.split("@")[0];

  if (payload?.userId) {
    return prisma.user.update({
      where: { id: payload.userId },
      data: {
        name,
        avatar: profile.profile_image_url?.replace("_normal", "") ?? undefined,
      },
    });
  }

  const existingAccount = await prisma.socialAccount.findFirst({
    where: {
      platform: "twitter",
      accountId: profile.id,
    },
    include: {
      user: true,
    },
  });

  if (existingAccount?.user) {
    return prisma.user.update({
      where: { id: existingAccount.user.id },
      data: {
        name: existingAccount.user.name ?? name,
        avatar:
          existingAccount.user.avatar ??
          profile.profile_image_url?.replace("_normal", "") ??
          undefined,
      },
    });
  }

  const existingEmailUser = await prisma.user.findUnique({ where: { email } });
  if (existingEmailUser) {
    return existingEmailUser;
  }

  return prisma.user.create({
    data: {
      email,
      name,
      avatar: profile.profile_image_url?.replace("_normal", "") ?? null,
    },
  });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const providerError = request.nextUrl.searchParams.get("error");
  const payload = readOAuthCookie<TwitterStateCookie>(request, TWITTER_OAUTH_COOKIE_NAME);

  if (providerError) {
    const response = buildFailureRedirect(request, "/login?error=twitter_denied");
    clearOAuthCookie(response, TWITTER_OAUTH_COOKIE_NAME);
    return response;
  }

  if (!code || !state || !payload || payload.state !== state) {
    const response = buildFailureRedirect(request);
    clearOAuthCookie(response, TWITTER_OAUTH_COOKIE_NAME);
    return response;
  }

  try {
    const tokens = await exchangeTwitterCode(code, payload.verifier);
    const profileResponse = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
        cache: "no-store",
      }
    );

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch Twitter profile");
    }

    const profile = await safeJson<TwitterProfile>(profileResponse);
    const user = await resolveAppUser(payload, profile.data);

    await prisma.socialAccount.upsert({
      where: {
        userId_platform: {
          userId: user.id,
          platform: "twitter",
        },
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        accountName: profile.data?.username ?? profile.data?.name ?? "X account",
        accountId: profile.data?.id ?? null,
      },
      create: {
        userId: user.id,
        platform: "twitter",
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        accountName: profile.data?.username ?? profile.data?.name ?? "X account",
        accountId: profile.data?.id ?? null,
      },
    });

    const response = NextResponse.redirect(new URL("/settings?connected=twitter", request.url), {
      status: 303,
    });
    appendSessionCookie(response, user.id);
    clearOAuthCookie(response, TWITTER_OAUTH_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("Twitter OAuth callback failed", error);
    const response = buildFailureRedirect(request);
    clearOAuthCookie(response, TWITTER_OAUTH_COOKIE_NAME);
    return response;
  }
}
