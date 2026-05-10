import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import {
  LinkedInPostImportError,
  fetchLinkedInAuthoredPosts,
  getFreshLinkedInAccount,
  isLinkedInReadPostsEnabled,
} from "@/lib/linkedin";
import { prisma } from "@/lib/prisma";
import {
  dedupeImportedVoicePosts,
  normalizeImportedVoicePost,
} from "@/lib/voice-dna-import";

const MIN_IMPORTED_POST_LENGTH = 100;

function csvFallbackResponse(error: string, status: number, code: string) {
  return NextResponse.json(
    {
      error,
      code,
      fallback: "csv",
      posts: [],
      total: 0,
    },
    { status }
  );
}

function isLinkedInPermissionFailure(error: LinkedInPostImportError) {
  if (error.status === 400 || error.status === 403) {
    return true;
  }

  const details = error.details?.toLowerCase() ?? "";
  return details.includes("scope") || details.includes("permission");
}

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  if (!isLinkedInReadPostsEnabled()) {
    return csvFallbackResponse(
      "LinkedIn post import is not enabled. Upload your LinkedIn export CSV instead.",
      403,
      "LINKEDIN_IMPORT_DISABLED"
    );
  }

  const account = await prisma.socialAccount.findUnique({
    where: {
      userId_platform: {
        userId: user.id,
        platform: "linkedin",
      },
    },
  });

  if (!account) {
    return csvFallbackResponse(
      "Connect a LinkedIn account before importing posts, or upload your LinkedIn export CSV.",
      409,
      "LINKEDIN_NOT_CONNECTED"
    );
  }

  const { accessToken, account: freshAccount } = await getFreshLinkedInAccount(account);
  const authorUrn = freshAccount.accountId;

  if (!authorUrn?.startsWith("urn:li:person:")) {
    return csvFallbackResponse(
      "Reconnect LinkedIn before importing posts, or upload your LinkedIn export CSV.",
      409,
      "LINKEDIN_ACCOUNT_ID_MISSING"
    );
  }

  try {
    const importedPosts = (await fetchLinkedInAuthoredPosts(accessToken, authorUrn))
      .map(normalizeImportedVoicePost)
      .filter((post) => post.length >= MIN_IMPORTED_POST_LENGTH);

    const profile = await prisma.voiceProfile.findUnique({
      where: { userId: user.id },
      select: { samplePosts: true },
    });

    const posts = dedupeImportedVoicePosts(importedPosts, profile?.samplePosts ?? []);

    return NextResponse.json({
      posts,
      total: posts.length,
    });
  } catch (error) {
    if (error instanceof LinkedInPostImportError && isLinkedInPermissionFailure(error)) {
      return csvFallbackResponse(
        "LinkedIn post import requires approved r_member_social access. Upload your LinkedIn export CSV instead.",
        403,
        "LINKEDIN_IMPORT_PERMISSION_DENIED"
      );
    }

    console.error("LinkedIn post import failed", error);
    return csvFallbackResponse(
      "LinkedIn post import is unavailable right now. Upload your LinkedIn export CSV instead.",
      502,
      "LINKEDIN_IMPORT_UNAVAILABLE"
    );
  }
}
