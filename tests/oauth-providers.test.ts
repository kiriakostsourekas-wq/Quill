import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  socialAccount: {
    update: vi.fn(),
  },
}));

const cryptoMock = vi.hoisted(() => ({
  encrypt: vi.fn((value: string) => `encrypted:${value}`),
  decrypt: vi.fn((value: string) =>
    value.startsWith("encrypted:") ? value.slice("encrypted:".length) : value
  ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/encrypt", () => cryptoMock);

import { getFreshLinkedInAccount, getLinkedInAuthUrl } from "@/lib/linkedin";
import { getFreshTwitterAccount } from "@/lib/twitter";

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: "account-1",
    userId: "user-1",
    platform: "twitter",
    accessToken: "encrypted:old-access",
    refreshToken: "encrypted:old-refresh",
    expiresAt: new Date(Date.now() + 1000),
    accountName: "Test Account",
    accountId: "urn:li:person:123",
    ...overrides,
  };
}

describe("provider token refresh", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.TWITTER_CLIENT_ID = "twitter-client";
    process.env.TWITTER_CLIENT_SECRET = "twitter-secret";
    process.env.LINKEDIN_CLIENT_ID = "linkedin-client";
    process.env.LINKEDIN_CLIENT_SECRET = "linkedin-secret";
    delete process.env.LINKEDIN_READ_POSTS_ENABLED;
  });

  it("keeps LinkedIn publishing OAuth scopes unchanged by default", () => {
    const url = new URL(getLinkedInAuthUrl("state-1"));

    expect(url.searchParams.get("scope")).toBe("openid profile email w_member_social");
  });

  it("requests LinkedIn read scope only for enabled import OAuth", () => {
    process.env.LINKEDIN_READ_POSTS_ENABLED = "true";

    const url = new URL(getLinkedInAuthUrl("state-1", { includeReadPostsScope: true }));

    expect(url.searchParams.get("scope")).toBe(
      "openid profile email w_member_social r_member_social"
    );
  });

  it("refreshes Twitter tokens and returns the updated access token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "fresh-twitter-access",
          refresh_token: "fresh-twitter-refresh",
          expires_in: 3600,
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    prismaMock.socialAccount.update.mockImplementation(async ({ data }) => ({
      ...account(),
      ...data,
    }));

    const result = await getFreshTwitterAccount(account());

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.twitter.com/2/oauth2/token",
      expect.objectContaining({ method: "POST" })
    );
    expect(prismaMock.socialAccount.update).toHaveBeenCalledWith({
      where: { id: "account-1" },
      data: expect.objectContaining({
        accessToken: "encrypted:fresh-twitter-access",
        refreshToken: "encrypted:fresh-twitter-refresh",
        expiresAt: expect.any(Date),
      }),
    });
    expect(result.accessToken).toBe("fresh-twitter-access");
  });

  it("falls back to the existing Twitter token when refresh fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await getFreshTwitterAccount(account());

    expect(prismaMock.socialAccount.update).not.toHaveBeenCalled();
    expect(result.accessToken).toBe("old-access");
    expect(warn).toHaveBeenCalledWith(
      "Twitter token refresh failed",
      expect.objectContaining({ accountId: "account-1" })
    );
  });

  it("refreshes LinkedIn tokens and returns the updated access token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "fresh-linkedin-access",
          refresh_token: "fresh-linkedin-refresh",
          expires_in: 3600,
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    prismaMock.socialAccount.update.mockImplementation(async ({ data }) => ({
      ...account({ platform: "linkedin" }),
      ...data,
    }));

    const result = await getFreshLinkedInAccount(account({ platform: "linkedin" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.linkedin.com/oauth/v2/accessToken",
      expect.objectContaining({ method: "POST" })
    );
    expect(prismaMock.socialAccount.update).toHaveBeenCalledWith({
      where: { id: "account-1" },
      data: expect.objectContaining({
        accessToken: "encrypted:fresh-linkedin-access",
        refreshToken: "encrypted:fresh-linkedin-refresh",
        expiresAt: expect.any(Date),
      }),
    });
    expect(result.accessToken).toBe("fresh-linkedin-access");
  });

  it("falls back to the existing LinkedIn token when refresh fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await getFreshLinkedInAccount(account({ platform: "linkedin" }));

    expect(prismaMock.socialAccount.update).not.toHaveBeenCalled();
    expect(result.accessToken).toBe("old-access");
    expect(warn).toHaveBeenCalledWith(
      "LinkedIn token refresh failed",
      expect.objectContaining({ accountId: "account-1" })
    );
  });
});
