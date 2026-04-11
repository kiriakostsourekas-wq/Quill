import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUserId, getSessionUserIdFromRequest } from "@/lib/session";

export async function getCurrentUser() {
  const userId = getCurrentSessionUserId();
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    include: { voiceProfile: true },
  });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function getRequestUser(request: NextRequest) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    include: { voiceProfile: true },
  });
}

export async function requireRequestUser(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}
