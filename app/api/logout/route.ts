import { NextResponse } from "next/server";
import { clearOnboardingCookie, clearSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });

  clearSessionCookie(response);
  clearOnboardingCookie(response);
  return response;
}
