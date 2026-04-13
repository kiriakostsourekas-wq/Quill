import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { appendOnboardingCookie, appendRoleCookie, appendSessionCookie } from "@/lib/session";

const onboardingSchema = z.object({
  useCase: z.string().trim().min(1, "Choose what brings you to Quill"),
  postingFreq: z.string().trim().min(1, "Choose how often you currently post"),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? "")
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Enter a valid email",
    }),
  marketingConsent: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const parsed = onboardingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid onboarding response" },
      { status: 400 }
    );
  }

  const email = parsed.data.email || null;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: true,
        marketingConsent: parsed.data.marketingConsent,
        ...(email ? { email } : {}),
        onboardingResponse: {
          upsert: {
            update: {
              useCase: parsed.data.useCase,
              postingFreq: parsed.data.postingFreq,
              email,
              marketingConsent: parsed.data.marketingConsent,
            },
            create: {
              useCase: parsed.data.useCase,
              postingFreq: parsed.data.postingFreq,
              email,
              marketingConsent: parsed.data.marketingConsent,
            },
          },
        },
      },
    });

    if (email && parsed.data.marketingConsent) {
      try {
        const recipientName = updatedUser.name ?? email.split("@")[0];
        await sendWelcomeEmail(email, recipientName);
      } catch (error) {
        console.warn("Failed to send onboarding welcome email", error);
      }
    }

    const response = NextResponse.json({ success: true });
    appendSessionCookie(response, updatedUser.id, true, updatedUser.role);
    appendOnboardingCookie(response, true);
    appendRoleCookie(response, updatedUser.role);
    return response;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That email is already associated with another account" },
        { status: 409 }
      );
    }

    console.error("Onboarding completion failed", error);
    return NextResponse.json({ error: "Unable to complete onboarding" }, { status: 500 });
  }
}
