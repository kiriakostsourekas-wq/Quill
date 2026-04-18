import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appendOnboardingCookie, appendRoleCookie, appendSessionCookie } from "@/lib/session";
import { readRequestJson } from "@/lib/utils";

const ADMIN_USER_ID = "cmnvyfeyc0000ib0407120wbe";

const setUserTypeSchema = z
  .object({
    onboardingCompleted: z.boolean().optional(),
    userType: z.enum(["creator", "builder", "beginner"]).nullable().optional(),
    linkedinActivityLevel: z
      .enum(["never", "occasionally", "regularly"])
      .nullable()
      .optional(),
    mainTopic: z.string().trim().min(1).max(100).nullable().optional(),
    contentGoal: z.enum(["brand", "clients", "knowledge", "job"]).nullable().optional(),
    communicationStyle: z
      .enum(["direct", "thoughtful", "energetic", "warm"])
      .nullable()
      .optional(),
    contrarianBelief: z.string().trim().min(1).max(300).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  if (user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await readRequestJson<unknown>(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const parsed = setUserTypeSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid user type payload" },
      { status: 400 }
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
  });

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
