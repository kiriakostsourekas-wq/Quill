import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;
  const customerId = typeof session.customer === "string" ? session.customer : null;

  if (!plan) return;

  if (userId) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (currentUser?.role === "admin") return;

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        stripeCustomerId: customerId ?? undefined,
      },
    });
    return;
  }

  if (customerId) {
    await prisma.user.updateMany({
      where: { stripeCustomerId: customerId, role: { not: "admin" } },
      data: { plan },
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : null;

  if (!customerId) return;

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId, role: { not: "admin" } },
    data: { plan: "free" },
  });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe webhook secret" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid webhook signature",
      },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
