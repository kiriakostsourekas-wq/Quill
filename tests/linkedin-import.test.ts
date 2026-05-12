import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireRequestUser: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  socialAccount: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  voiceProfile: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireRequestUser: authMocks.requireRequestUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { POST as importLinkedInPosts } from "@/app/api/voice-dna/import-linkedin/route";
import { encrypt } from "@/lib/encrypt";
import { normalizeImportedVoicePost } from "@/lib/voice-dna-import";

function jsonRequest() {
  return new Request("http://localhost/api/voice-dna/import-linkedin", {
    method: "POST",
  }) as NextRequest;
}

function longPost(label: string) {
  return `${label} ${"A specific operating lesson with enough context for Voice DNA import. ".repeat(3)}`;
}

function linkedInAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: "linkedin-account-1",
    userId: "user-1",
    platform: "linkedin",
    accessToken: encrypt("linkedin-access-token"),
    refreshToken: null,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    accountName: "LinkedIn User",
    accountId: "urn:li:person:test-member",
    ...overrides,
  };
}

function linkedInPostsResponse(elements: unknown[]) {
  return new Response(
    JSON.stringify({
      elements,
      paging: { links: [] },
    }),
    { status: 200 }
  );
}

describe("LinkedIn Voice DNA import", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    process.env.LINKEDIN_READ_POSTS_ENABLED = "true";
    process.env.LINKEDIN_CLIENT_ID = "linkedin-client";
    process.env.LINKEDIN_CLIENT_SECRET = "linkedin-secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    authMocks.requireRequestUser.mockResolvedValue({ id: "user-1" });
    prismaMock.socialAccount.findUnique.mockResolvedValue(linkedInAccount());
    prismaMock.voiceProfile.findUnique.mockResolvedValue({ samplePosts: [] });
  });

  it("falls back to CSV when the server feature flag is off", async () => {
    delete process.env.LINKEDIN_READ_POSTS_ENABLED;

    const response = await importLinkedInPosts(jsonRequest());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toMatchObject({
      code: "LINKEDIN_IMPORT_DISABLED",
      fallback: "csv",
      posts: [],
      total: 0,
    });
    expect(prismaMock.socialAccount.findUnique).not.toHaveBeenCalled();
  });

  it("requires a connected LinkedIn account", async () => {
    prismaMock.socialAccount.findUnique.mockResolvedValue(null);

    const response = await importLinkedInPosts(jsonRequest());
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data).toMatchObject({
      code: "LINKEDIN_NOT_CONNECTED",
      fallback: "csv",
      posts: [],
      total: 0,
    });
  });

  it("fetches LinkedIn posts and normalizes importable commentary", async () => {
    const firstPost = longPost("First imported post");
    const legacyPost = longPost("Legacy imported post");
    const fetchMock = vi.fn().mockResolvedValue(
      linkedInPostsResponse([
        { commentary: `  ${firstPost}\n\nwith line breaks  ` },
        { commentary: "Too short" },
        {
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: legacyPost },
            },
          },
        },
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await importLinkedInPosts(jsonRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      posts: [
        normalizeImportedVoicePost(`${firstPost}\n\nwith line breaks`),
        normalizeImportedVoicePost(legacyPost),
      ],
      total: 2,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://api.linkedin.com/rest/posts"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer linkedin-access-token",
          "LinkedIn-Version": "202602",
          "X-RestLi-Method": "FINDER",
          "X-Restli-Protocol-Version": "2.0.0",
        }),
      })
    );
  });

  it("returns a CSV fallback when LinkedIn denies read permission", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Member permissions must be used" }), {
          status: 403,
        })
      )
    );

    const response = await importLinkedInPosts(jsonRequest());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toMatchObject({
      code: "LINKEDIN_IMPORT_PERMISSION_DENIED",
      fallback: "csv",
      posts: [],
      total: 0,
    });
    expect(prismaMock.voiceProfile.findUnique).not.toHaveBeenCalled();
  });

  it("dedupes LinkedIn imports against existing sample posts", async () => {
    const duplicate = longPost("Duplicate imported post");
    const unique = longPost("Unique imported post");
    prismaMock.voiceProfile.findUnique.mockResolvedValue({
      samplePosts: [normalizeImportedVoicePost(duplicate)],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        linkedInPostsResponse([
          { commentary: `  ${duplicate.replace(/\s+/g, "   ")}  ` },
          { commentary: unique },
        ])
      )
    );

    const response = await importLinkedInPosts(jsonRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      posts: [normalizeImportedVoicePost(unique)],
      total: 1,
    });
  });
});
