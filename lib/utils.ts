import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteAppUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

export async function safeJson<T>(response: Response) {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export function parseJsonObject<T>(content: string): T {
  const trimmed = content.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return JSON.parse(trimmed.slice(start, end + 1)) as T;
}

export function splitVoiceSamples(raw: string) {
  return raw
    .split(/\n\s*\n|\n/)
    .map((sample) => sample.trim())
    .filter(Boolean);
}
