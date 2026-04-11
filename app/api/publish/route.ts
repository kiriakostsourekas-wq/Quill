import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { publishPostById } from "@/lib/publishing";

const publishSchema = z.object({
  postId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = publishSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  const internalSecret = request.headers.get("x-quill-internal-secret");
  const isInternal =
    !!internalSecret && internalSecret === (process.env.ENCRYPTION_KEY ?? "");
  const user = isInternal ? null : await getRequestUser(request);

  if (!isInternal && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const post = await publishPostById(parsed.data.postId, user?.id);
    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Publishing failed",
      },
      { status: 400 }
    );
  }
}

