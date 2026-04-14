import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { LINKEDIN_OAUTH_COOKIE_NAME } from "@/lib/constants";
import { assertLinkedInAuthConfig, getLinkedInAuthUrl } from "@/lib/linkedin";
import { appendOAuthCookie } from "@/lib/oauth";
import { PlanLimitError, assertFreePlanSocialAccountLimit } from "@/lib/plans";

export async function POST(request: NextRequest) {
  try {
    assertLinkedInAuthConfig();

    const user = await getRequestUser(request);
    if (user) {
      await assertFreePlanSocialAccountLimit(user, "linkedin");
    }
    const state = randomBytes(16).toString("hex");
    const response = NextResponse.redirect(getLinkedInAuthUrl(state), { status: 303 });
    const returnTo = user ? "/settings?connected=linkedin" : "/dashboard";

    appendOAuthCookie(response, LINKEDIN_OAUTH_COOKIE_NAME, {
      state,
      userId: user?.id ?? null,
      returnTo,
    });

    return response;
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.redirect(new URL("/settings?error=account_limit", request.url), {
        status: 303,
      });
    }
    console.error("LinkedIn OAuth start failed", error);
    return NextResponse.redirect(new URL("/login?error=linkedin_not_configured", request.url), {
      status: 303,
    });
  }
}
