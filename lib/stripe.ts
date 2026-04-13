import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { absoluteAppUrl } from "@/lib/utils";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? "";

export const stripe = new Stripe(stripeSecretKey || "sk_test_missing");

export async function ensureStripeCustomer(user: {
  id: string;
  email: string;
  name: string | null;
  stripeCustomerId: string | null;
}) {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function getStripePriceId(plan: "solo" | "pro") {
  const priceId =
    plan === "solo" ? process.env.STRIPE_SOLO_PRICE_ID : process.env.STRIPE_PRO_PRICE_ID;

  if (!priceId) {
    throw new Error(`Missing Stripe price ID for "${plan}"`);
  }

  return priceId;
}

export function getCheckoutUrls() {
  return {
    successUrl: absoluteAppUrl("/settings?checkout=success"),
    cancelUrl: absoluteAppUrl("/settings?checkout=cancelled"),
  };
}
