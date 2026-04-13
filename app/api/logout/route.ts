import { NextResponse } from "next/server";
import { clearOnboardingCookie, clearRoleCookie, clearSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });

  clearSessionCookie(response);
  clearOnboardingCookie(response);
  clearRoleCookie(response);
  return response;
}
