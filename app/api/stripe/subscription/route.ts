import { NextRequest, NextResponse } from "next/server";
import { isAdminUser, requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      plan: "admin",
      status: "admin",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  }

  return NextResponse.json({
    plan: "beta",
    status: "beta",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    betaAccess: true,
    message: "All Pro features are unlocked during beta.",
  });
}
