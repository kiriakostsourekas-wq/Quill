import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appendOnboardingCookie, appendRoleCookie, appendSessionCookie } from "@/lib/session";

const ADMIN_USER_ID = "cmnvyfeyc0000ib0407120wbe";

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  if (user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [, updatedUser] = await prisma.$transaction([
    prisma.voiceProfile.deleteMany({
      where: { userId: user.id },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: false,
        userType: null,
        linkedinActivityLevel: null,
        mainTopic: null,
        contentGoal: null,
        communicationStyle: null,
        contrarianBelief: null,
      },
    }),
  ]);

  const response = NextResponse.json({
    success: true,
    user: {
      onboardingCompleted: updatedUser.onboardingCompleted,
      userType: updatedUser.userType,
      linkedinActivityLevel: updatedUser.linkedinActivityLevel,
      mainTopic: updatedUser.mainTopic,
      contentGoal: updatedUser.contentGoal,
      communicationStyle: updatedUser.communicationStyle,
      contrarianBelief: updatedUser.contrarianBelief,
    },
  });
  appendSessionCookie(
    response,
    updatedUser.id,
    updatedUser.onboardingCompleted,
    updatedUser.role
  );
  appendOnboardingCookie(response, updatedUser.onboardingCompleted);
  appendRoleCookie(response, updatedUser.role);
  return response;
}
