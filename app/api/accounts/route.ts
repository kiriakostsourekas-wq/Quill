import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const accounts = await prisma.socialAccount.findMany({
    where: { userId: user.id },
    orderBy: { platform: "asc" },
    select: {
      platform: true,
      accountName: true,
    },
  });

  return NextResponse.json({ accounts });
}

