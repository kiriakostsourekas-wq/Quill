import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { TWITTER_OAUTH_COOKIE_NAME } from "@/lib/constants";
import { appendOAuthCookie } from "@/lib/oauth";
import { createTwitterPkcePair, getTwitterAuthUrl } from "@/lib/twitter";

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  const state = randomBytes(16).toString("hex");
  const { verifier, challenge } = createTwitterPkcePair();
  const response = NextResponse.redirect(getTwitterAuthUrl(state, challenge), { status: 303 });

  appendOAuthCookie(response, TWITTER_OAUTH_COOKIE_NAME, {
    state,
    verifier,
    userId: user?.id ?? null,
  });

  return response;
}

