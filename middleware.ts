import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
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
