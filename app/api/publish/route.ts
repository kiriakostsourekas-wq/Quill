import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { claimAndPublishPost, ImmutablePostError, PublishConflictError } from "@/lib/publishing";
import { readRequestJson } from "@/lib/utils";

const publishSchema = z.object({
  postId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await readRequestJson<unknown>(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }

  const parsed = publishSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const internalSecret = request.headers.get("x-quill-internal-secret") ?? bearerToken;
  const isInternal = !!internalSecret && internalSecret === (process.env.CRON_SECRET ?? "");
  const user = isInternal ? null : await getRequestUser(request);

  if (!isInternal && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const post = await claimAndPublishPost(
      parsed.data.postId,
      isInternal ? "internal" : "manual",
      user?.id
    );
    return NextResponse.json({ post });
  } catch (error) {
    if (error instanceof PublishConflictError || error instanceof ImmutablePostError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Publishing failed",
      },
      { status: 400 }
    );
  }
}
