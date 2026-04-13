import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { getEffectivePlan, requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      plan: getEffectivePlan(user),
      role: user.role,
      voiceProfile: user.voiceProfile,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const parsed = updateMeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid profile update" },
      { status: 400 }
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
    },
    include: {
      voiceProfile: true,
    },
  });

  return NextResponse.json({
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatar: updatedUser.avatar,
      plan: getEffectivePlan(updatedUser),
      role: updatedUser.role,
      voiceProfile: updatedUser.voiceProfile,
    },
  });
}
