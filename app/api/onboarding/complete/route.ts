import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appendOnboardingCookie, appendRoleCookie, appendSessionCookie } from "@/lib/session";
import { readRequestJson } from "@/lib/utils";

const linkedinActivityLevels = ["never", "occasionally", "regularly"] as const;
const contentGoals = ["brand", "clients", "knowledge", "job"] as const;
const communicationStyles = ["direct", "thoughtful", "energetic", "warm"] as const;

const onboardingCompleteSchema = z
  .object({
    linkedinActivityLevel: z.enum(linkedinActivityLevels),
    mainTopic: z.string().trim().min(1, "Enter your main topic").max(100, "Keep it under 100 characters"),
    contentGoal: z.enum(contentGoals),
    communicationStyle: z.enum(communicationStyles).nullable().optional(),
    contrarianBelief: z
      .string()
      .trim()
      .max(300, "Keep it under 300 characters")
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.linkedinActivityLevel !== "regularly" && !data.communicationStyle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["communicationStyle"],
        message: "Choose your communication style",
      });
    }
  });

function getUserType(linkedinActivityLevel: (typeof linkedinActivityLevels)[number]) {
  switch (linkedinActivityLevel) {
    case "regularly":
      return "creator";
    case "occasionally":
      return "builder";
    default:
      return "beginner";
  }
}

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const body = await readRequestJson<unknown>(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const parsed = onboardingCompleteSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid onboarding response" },
      { status: 400 }
    );
  }

  const communicationStyle =
    parsed.data.linkedinActivityLevel === "regularly"
      ? null
      : parsed.data.communicationStyle ?? null;
  const contrarianBelief =
    parsed.data.linkedinActivityLevel === "never"
      ? parsed.data.contrarianBelief?.trim() || null
      : null;
  const userType = getUserType(parsed.data.linkedinActivityLevel);

  try {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: true,
        linkedinActivityLevel: parsed.data.linkedinActivityLevel,
        mainTopic: parsed.data.mainTopic.trim(),
        contentGoal: parsed.data.contentGoal,
        communicationStyle,
        contrarianBelief,
        userType,
      },
    });

    const response = NextResponse.json({ success: true });
    appendSessionCookie(response, updatedUser.id, true, updatedUser.role);
    appendOnboardingCookie(response, true);
    appendRoleCookie(response, updatedUser.role);
    return response;
  } catch (error) {
    console.error("Onboarding completion failed", error);
    return NextResponse.json({ error: "Unable to complete onboarding" }, { status: 500 });
  }
}
