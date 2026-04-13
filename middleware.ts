import { NextRequest, NextResponse } from "next/server";
import { ONBOARDING_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/constants";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const onboardingCookie = request.cookies.get(ONBOARDING_COOKIE_NAME)?.value;
  const onboardingCompleted = onboardingCookie === "completed";
  const isOnboardingPath = pathname.startsWith("/onboarding");

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isOnboardingPath && onboardingCompleted) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isOnboardingPath && !onboardingCompleted) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/compose/:path*",
    "/scheduled/:path*",
    "/voice-dna/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/onboarding",
  ],
};
