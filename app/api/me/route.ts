import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { getEffectivePlan, requireRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVoiceProfileClientState } from "@/lib/voice-foundations";
import { readRequestJson } from "@/lib/utils";

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
      mainTopic: user.mainTopic,
      topics: user.topics,
      voiceProfile: getVoiceProfileClientState(user.voiceProfile),
    },
  });
}

export async function PATCH(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  const body = await readRequestJson<unknown>(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const parsed = updateMeSchema.safeParse(body.data);
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
      mainTopic: updatedUser.mainTopic,
      topics: updatedUser.topics,
      voiceProfile: getVoiceProfileClientState(updatedUser.voiceProfile),
    },
  });
}
