import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { LINKEDIN_OAUTH_COOKIE_NAME } from "@/lib/constants";
import { getLinkedInAuthUrl } from "@/lib/linkedin";
import { appendOAuthCookie } from "@/lib/oauth";

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(getLinkedInAuthUrl(state), { status: 303 });

  appendOAuthCookie(response, LINKEDIN_OAUTH_COOKIE_NAME, {
    state,
    userId: user?.id ?? null,
  });

  return response;
}

