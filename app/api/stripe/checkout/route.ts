import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { ensureStripeCustomer, getCheckoutUrls, getStripePriceId, stripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  plan: z.enum(["solo", "pro"]),
});

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
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
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: user.id,
      plan: parsed.data.plan,
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        plan: parsed.data.plan,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}

