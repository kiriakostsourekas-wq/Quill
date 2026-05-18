import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { LINKEDIN_OAUTH_COOKIE_NAME } from "@/lib/constants";
import {
  assertLinkedInAuthConfig,
  getLinkedInAuthUrl,
  isLinkedInReadPostsEnabled,
} from "@/lib/linkedin";
import { appendOAuthCookie } from "@/lib/oauth";
import { PlanLimitError, assertFreePlanSocialAccountLimit } from "@/lib/plans";

async function getOAuthIntent(request: NextRequest) {
  const queryIntent = request.nextUrl.searchParams.get("intent");
  if (queryIntent === "import") {
    return "import";
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (
    !contentType.includes("application/x-www-form-urlencoded") &&
    !contentType.includes("multipart/form-data")
  ) {
    return "connect";
  }

  const formData = await request.formData();
  return formData.get("intent") === "import" ? "import" : "connect";
}

export async function POST(request: NextRequest) {
  let user: Awaited<ReturnType<typeof getRequestUser>> = null;
  let intent: Awaited<ReturnType<typeof getOAuthIntent>> = "connect";

  try {
    user = await getRequestUser(request);
    intent = await getOAuthIntent(request);
    assertLinkedInAuthConfig();

    if (user) {
      await assertFreePlanSocialAccountLimit(user, "linkedin");
    }
    if (intent === "import" && !isLinkedInReadPostsEnabled()) {
      return NextResponse.redirect(
        new URL("/voice-dna/import?error=linkedin_import_disabled", request.url),
        { status: 303 }
      );
    }

    const isImportIntent = intent === "import";
    const state = randomBytes(16).toString("hex");
    const response = NextResponse.redirect(
      getLinkedInAuthUrl(state, { includeReadPostsScope: isImportIntent }),
      { status: 303 }
    );
    const returnTo = isImportIntent
      ? "/voice-dna/import?linkedin=authorized"
      : user
        ? "/settings?connected=linkedin"
        : "/dashboard";

    appendOAuthCookie(response, LINKEDIN_OAUTH_COOKIE_NAME, {
      state,
      userId: user?.id ?? null,
      returnTo,
      intent,
    });

    return response;
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.redirect(new URL("/settings?error=account_limit", request.url), {
        status: 303,
      });
    }
    const message = error instanceof Error ? error.message : "LinkedIn OAuth is not configured";
    if (message.includes("not configured")) {
      console.warn(`LinkedIn OAuth unavailable: ${message}`);
    } else {
      console.error("LinkedIn OAuth start failed", error);
    }
    const destination =
      intent === "import"
        ? "/voice-dna/import?error=linkedin_not_configured"
        : user
          ? "/settings?error=linkedin_not_configured"
          : "/login?error=linkedin_not_configured";
    return NextResponse.redirect(new URL(destination, request.url), { status: 303 });
  }
}
