import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { isAdminUser, requireRequestUser } from "@/lib/auth";
import { ensureStripeCustomer, getCheckoutUrls, getStripePriceId, stripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  plan: z.enum(["solo", "pro"]),
});

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  if (isAdminUser(user)) {
    return NextResponse.json(
      { error: "Admin accounts do not require billing" },
      { status: 403 }
    );
  }

  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const customerId = await ensureStripeCustomer(user);
  const priceId = await getStripePriceId(parsed.data.plan);
  const { successUrl, cancelUrl } = getCheckoutUrls();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    payment_method_collection: "always",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: user.id,
      plan: parsed.data.plan,
    },
    subscription_data: {
      trial_period_days: 7,
      metadata: {
        userId: user.id,
        plan: parsed.data.plan,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
