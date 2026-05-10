import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => {
  class PublishConflictError extends Error {}

  return {
    findMany: vi.fn(),
    claimAndPublishPost: vi.fn(),
    PublishConflictError,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: routeMocks.findMany,
    },
  },
}));

vi.mock("@/lib/publishing", () => ({
  claimAndPublishPost: routeMocks.claimAndPublishPost,
  PublishConflictError: routeMocks.PublishConflictError,
}));

vi.mock("@/lib/scheduling", () => ({
  AUTO_SCHEDULING_ENABLED: true,
  AUTO_SCHEDULING_UNAVAILABLE_MESSAGE: "Auto scheduling is unavailable",
}));

import { GET } from "@/app/api/cron/publish/route";

function cronRequest(secret: string) {
  return new NextRequest("http://localhost/api/cron/publish", {
    headers: {
      authorization: `Bearer ${secret}`,
    },
  });
}

describe("cron publish route", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
  });

  it("sweeps due scheduled posts", async () => {
    routeMocks.findMany.mockResolvedValue([{ id: "post-1" }, { id: "post-2" }]);
    routeMocks.claimAndPublishPost.mockResolvedValue({ status: "published" });

    const response = await GET(cronRequest("cron-secret"));

    await expect(response.json()).resolves.toEqual({
      scanned: 2,
      published: 2,
      skipped: 0,
      failed: [],
    });
    expect(response.status).toBe(200);
    expect(routeMocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "scheduled",
          scheduledAt: expect.objectContaining({ lte: expect.any(Date) }),
        }),
        orderBy: { scheduledAt: "asc" },
        select: { id: true },
      })
    );
    expect(routeMocks.claimAndPublishPost).toHaveBeenNthCalledWith(1, "post-1", "cron");
    expect(routeMocks.claimAndPublishPost).toHaveBeenNthCalledWith(2, "post-2", "cron");
  });

  it("rejects bad cron secrets", async () => {
    const response = await GET(cronRequest("wrong-secret"));

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(response.status).toBe(401);
    expect(routeMocks.findMany).not.toHaveBeenCalled();
    expect(routeMocks.claimAndPublishPost).not.toHaveBeenCalled();
  });
});
