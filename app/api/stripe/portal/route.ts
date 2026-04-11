import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { ensureStripeCustomer, stripe } from "@/lib/stripe";
import { absoluteAppUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const customerId = await ensureStripeCustomer(user);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: absoluteAppUrl("/settings"),
  });

  return NextResponse.json({ url: session.url });
}

