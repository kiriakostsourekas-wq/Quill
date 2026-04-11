import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { decrypt, encrypt } from "@/lib/encrypt";

type SessionPayload = {
  userId: string;
};

function encodeSession(payload: SessionPayload) {
  return encrypt(JSON.stringify(payload));
}

function decodeSession(value: string): SessionPayload | null {
  try {
    const parsed = JSON.parse(decrypt(value)) as SessionPayload;
    return parsed?.userId ? parsed : null;
  } catch {
    return null;
  }
}

export function appendSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: encodeSession({ userId }),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
  });
}

export function getSessionUserIdFromRequest(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decodeSession(cookie)?.userId ?? null;
}

export function getCurrentSessionUserId() {
  const cookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decodeSession(cookie)?.userId ?? null;
}
