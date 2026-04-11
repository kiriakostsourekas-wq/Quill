import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  context: { params: { platform: string } }
) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const platform = context.params.platform;
  if (platform !== "linkedin" && platform !== "twitter") {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  await prisma.socialAccount.deleteMany({
    where: {
      userId: user.id,
      platform,
    },
  });

  return NextResponse.json({ success: true });
}

