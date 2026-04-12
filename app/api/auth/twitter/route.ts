import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { TWITTER_OAUTH_COOKIE_NAME } from "@/lib/constants";
import { appendOAuthCookie } from "@/lib/oauth";
import {
  assertTwitterAuthConfig,
  createTwitterPkcePair,
  getTwitterAuthUrl,
} from "@/lib/twitter";

export async function POST(request: NextRequest) {
  try {
    assertTwitterAuthConfig();

    const user = await getRequestUser(request);
    const state = randomBytes(16).toString("hex");
    const { verifier, challenge } = createTwitterPkcePair();
    const response = NextResponse.redirect(getTwitterAuthUrl(state, challenge), { status: 303 });
    const returnTo = user ? "/settings?connected=twitter" : "/dashboard";

    appendOAuthCookie(response, TWITTER_OAUTH_COOKIE_NAME, {
      state,
      verifier,
      userId: user?.id ?? null,
      returnTo,
    });

    return response;
  } catch (error) {
    console.error("Twitter OAuth start failed", error);
    return NextResponse.redirect(new URL("/login?error=twitter_not_configured", request.url), {
      status: 303,
    });
  }
}
