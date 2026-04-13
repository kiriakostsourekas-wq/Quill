import { NextRequest, NextResponse } from "next/server";
import { isAdminUser, requireRequestUser } from "@/lib/auth";
import { ensureStripeCustomer, stripe } from "@/lib/stripe";
import { absoluteAppUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  if (isAdminUser(user)) {
    return NextResponse.json(
      { error: "Admin accounts do not use Stripe billing" },
      { status: 403 }
    );
  }

  const customerId = await ensureStripeCustomer(user);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: absoluteAppUrl("/settings"),
  });

  return NextResponse.json({ url: session.url });
}
