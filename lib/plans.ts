import { getEffectivePlan } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const FREE_PLAN_MONTHLY_POST_LIMIT = 10;
export const BETA_MODE_ENABLED = true;

type PlanUser = {
  id: string;
  plan: string;
  role: string;
};

export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export function isFreePlanUser(user: Pick<PlanUser, "plan" | "role">) {
  return !BETA_MODE_ENABLED && getEffectivePlan(user) === "free";
}

export function assertPlanAllowsPlatforms(
  user: Pick<PlanUser, "plan" | "role">,
  platforms: string[]
) {
  if (BETA_MODE_ENABLED) return;
  if (!isFreePlanUser(user)) return;

  if (new Set(platforms).size > 1) {
    throw new PlanLimitError("Free includes single-platform publishing. Upgrade to post to LinkedIn and X.");
  }
}

export async function assertFreePlanPostLimit(user: PlanUser, postId?: string | null) {
  if (BETA_MODE_ENABLED) return;
  if (!isFreePlanUser(user) || postId) return;

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const count = await prisma.post.count({
    where: {
      userId: user.id,
      createdAt: {
        gte: startOfMonth,
      },
    },
  });

  if (count >= FREE_PLAN_MONTHLY_POST_LIMIT) {
    throw new PlanLimitError(
      `Free includes up to ${FREE_PLAN_MONTHLY_POST_LIMIT} posts per month. Upgrade to publish more.`
    );
  }
}

export async function assertFreePlanSocialAccountLimit(
  user: PlanUser,
  platform: "linkedin" | "twitter"
) {
  if (BETA_MODE_ENABLED) return;
  if (!isFreePlanUser(user)) return;

  const existing = await prisma.socialAccount.findMany({
    where: { userId: user.id },
    select: { platform: true },
  });

  const otherPlatformConnected = existing.some((account) => account.platform !== platform);
  if (otherPlatformConnected) {
    throw new PlanLimitError(
      "Free includes one connected social account. Upgrade to connect both LinkedIn and X."
    );
  }
}
