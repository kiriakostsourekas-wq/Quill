import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";

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

  return NextResponse.json(
    {
      betaAccess: true,
      error: "Billing is paused during beta. All Pro features are currently unlocked for free.",
    },
    { status: 403 }
  );
}
