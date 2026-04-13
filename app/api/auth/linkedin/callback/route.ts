import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appendOnboardingCookie, appendRoleCookie, appendSessionCookie } from "@/lib/session";
import { exchangeLinkedInCode } from "@/lib/linkedin";
import { appendOAuthCookie, clearOAuthCookie, readOAuthCookie } from "@/lib/oauth";
import { LINKEDIN_OAUTH_COOKIE_NAME } from "@/lib/constants";
import { encrypt } from "@/lib/encrypt";
import { safeJson } from "@/lib/utils";

type LinkedInStateCookie = {
  state: string;
  userId: string | null;
  returnTo?: string | null;
};

type LinkedInProfile = {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
};

function buildFailureRedirect(request: NextRequest, path = "/login?error=linkedin_auth") {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

async function resolveAppUser(payload: LinkedInStateCookie | null, profile: LinkedInProfile) {
  const email = profile.email ?? `linkedin-${profile.sub ?? Date.now()}@users.quill.local`;
  const name =
    profile.name ??
    ([profile.given_name, profile.family_name].filter(Boolean).join(" ").trim() ||
      email.split("@")[0]);

  if (payload?.userId) {
    return prisma.user.update({
      where: { id: payload.userId },
      data: {
        email,
        name,
        avatar: profile.picture ?? undefined,
      },
    });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: existing.name ?? name,
        avatar: existing.avatar ?? profile.picture ?? undefined,
      },
    });
  }

  return prisma.user.create({
    data: {
      email,
      name,
      avatar: profile.picture ?? null,
    },
  });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const providerError = request.nextUrl.searchParams.get("error");
  const payload = readOAuthCookie<LinkedInStateCookie>(request, LINKEDIN_OAUTH_COOKIE_NAME);

  if (providerError) {
    const response = buildFailureRedirect(request, "/login?error=linkedin_denied");
    clearOAuthCookie(response, LINKEDIN_OAUTH_COOKIE_NAME);
    return response;
  }

  if (!code || !state || !payload || payload.state !== state) {
    const response = buildFailureRedirect(request);
    clearOAuthCookie(response, LINKEDIN_OAUTH_COOKIE_NAME);
    return response;
  }

  try {
    const tokens = await exchangeLinkedInCode(code);
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
      cache: "no-store",
    });

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch LinkedIn profile");
    }

    const profile = await safeJson<LinkedInProfile>(profileResponse);
    const user = await resolveAppUser(payload, profile);

    await prisma.socialAccount.upsert({
      where: {
        userId_platform: {
          userId: user.id,
          platform: "linkedin",
        },
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        accountName: profile.name ?? profile.email ?? "LinkedIn account",
        accountId: profile.sub ? `urn:li:person:${profile.sub}` : null,
      },
      create: {
        userId: user.id,
        platform: "linkedin",
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        accountName: profile.name ?? profile.email ?? "LinkedIn account",
        accountId: profile.sub ? `urn:li:person:${profile.sub}` : null,
      },
    });

    const destination = !user.onboardingCompleted
      ? "/onboarding"
      : payload.returnTo && payload.returnTo.startsWith("/")
        ? payload.returnTo
        : "/settings?connected=linkedin";
    const response = NextResponse.redirect(new URL(destination, request.url), { status: 303 });
    appendSessionCookie(response, user.id, user.onboardingCompleted, user.role);
    appendOnboardingCookie(response, user.onboardingCompleted);
    appendRoleCookie(response, user.role);
    clearOAuthCookie(response, LINKEDIN_OAUTH_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("LinkedIn OAuth callback failed", error);
    const response = buildFailureRedirect(request);
    clearOAuthCookie(response, LINKEDIN_OAUTH_COOKIE_NAME);
    return response;
  }
}
