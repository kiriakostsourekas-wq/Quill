import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import {
  TWITTER_OAUTH_COOKIE_NAME,
  TWITTER_PKCE_VERIFIER_COOKIE_NAME,
} from "@/lib/constants";
import { appendOAuthCookie } from "@/lib/oauth";
import { PlanLimitError, assertFreePlanSocialAccountLimit } from "@/lib/plans";
import {
  assertTwitterAuthConfig,
  getTwitterAuthUrl,
} from "@/lib/twitter";

export async function POST(request: NextRequest) {
  try {
    assertTwitterAuthConfig();

    const user = await getRequestUser(request);
    if (user) {
      await assertFreePlanSocialAccountLimit(user, "twitter");
    }
    const state = randomBytes(16).toString("hex");
    const { url, verifier } = getTwitterAuthUrl(state);
    const response = NextResponse.redirect(url, { status: 303 });
    const returnTo = user ? "/settings?connected=twitter" : "/dashboard";

    appendOAuthCookie(response, TWITTER_OAUTH_COOKIE_NAME, {
      state,
      userId: user?.id ?? null,
      returnTo,
    });
    appendOAuthCookie(response, TWITTER_PKCE_VERIFIER_COOKIE_NAME, {
      verifier,
    });

    return response;
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.redirect(new URL("/settings?error=account_limit", request.url), {
        status: 303,
      });
    }
    console.error("Twitter OAuth start failed", error);
    return NextResponse.redirect(new URL("/login?error=twitter_not_configured", request.url), {
      status: 303,
    });
  }
}
