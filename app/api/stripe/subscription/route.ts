import { NextRequest, NextResponse } from "next/server";
import { getEffectivePlan, isAdminUser, requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "incomplete",
]);

export async function GET(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const freshUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      plan: true,
      role: true,
      stripeCustomerId: true,
    },
  });

  if (!freshUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (isAdminUser(freshUser)) {
    return NextResponse.json({
      plan: "pro",
      status: "admin",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  }

  if (!freshUser.stripeCustomerId) {
    return NextResponse.json({
      plan: getEffectivePlan(freshUser),
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: freshUser.stripeCustomerId,
    status: "all",
    limit: 10,
    expand: ["data.items.data.price"],
  });

  const subscription =
    subscriptions.data.find((item) => ACTIVE_SUBSCRIPTION_STATUSES.has(item.status)) ??
    subscriptions.data[0] ??
    null;

  if (!subscription) {
    return NextResponse.json({
      plan: getEffectivePlan(freshUser),
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  }

  const price = subscription.items.data[0]?.price;
  const lookupKey = "lookup_key" in price ? price.lookup_key : null;
  const currentPeriodEnd =
    subscription.items.data
      .map((item) => item.current_period_end)
      .find((value): value is number => typeof value === "number") ?? null;

  return NextResponse.json({
    plan:
      typeof lookupKey === "string" && lookupKey.length > 0
        ? lookupKey
        : getEffectivePlan(freshUser),
    status: subscription.status,
    currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}
