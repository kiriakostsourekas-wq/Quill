import { NextRequest, NextResponse } from "next/server";
import { decrypt, encrypt } from "@/lib/encrypt";

type OAuthCookiePayload = Record<string, string | null>;

export function appendOAuthCookie(
  response: NextResponse,
  name: string,
  payload: OAuthCookiePayload
) {
  response.cookies.set({
    name,
    value: encrypt(JSON.stringify(payload)),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
}

export function readOAuthCookie<T extends OAuthCookiePayload>(
  request: NextRequest,
  name: string
) {
  const value = request.cookies.get(name)?.value;
  if (!value) return null;

  try {
    return JSON.parse(decrypt(value)) as T;
  } catch {
    return null;
  }
}

export function clearOAuthCookie(response: NextResponse, name: string) {
  response.cookies.set({
    name,
    value: "",
    path: "/",
    maxAge: 0,
  });
}

