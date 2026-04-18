import { NextRequest, NextResponse } from "next/server";
import { ONBOARDING_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/constants";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const onboardingCookie = request.cookies.get(ONBOARDING_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (request.nextUrl.pathname === "/onboarding") {
    if (onboardingCookie === "completed") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  if (onboardingCookie === "pending") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/compose/:path*",
    "/carousel/:path*",
    "/scheduled/:path*",
    "/calendar/:path*",
    "/voice-dna/:path*",
    "/ideas/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/onboarding",
  ],
};
