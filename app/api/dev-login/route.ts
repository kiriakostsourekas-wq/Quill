import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  appendOnboardingCookie,
  appendRoleCookie,
  appendSessionCookie,
} from "@/lib/session";

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      onboardingCompleted: true,
      role: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const response = NextResponse.redirect(
    new URL(safeRedirectPath(request.nextUrl.searchParams.get("to")), request.url),
    { status: 303 }
  );

  appendSessionCookie(response, user.id, user.onboardingCompleted, user.role);
  appendOnboardingCookie(response, user.onboardingCompleted);
  appendRoleCookie(response, user.role);

  return response;
}
