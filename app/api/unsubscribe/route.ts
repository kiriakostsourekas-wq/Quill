import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim();

  if (!email) {
    return NextResponse.json({ error: "Missing email query parameter" }, { status: 400 });
  }

  await prisma.user.updateMany({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    data: { marketingConsent: false },
  });

  return NextResponse.json({ success: true });
}
