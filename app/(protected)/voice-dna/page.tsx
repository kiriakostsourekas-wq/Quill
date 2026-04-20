import Link from "next/link";
import { VoiceDnaClient } from "@/components/app/voice-dna-client";
import { getCurrentUser } from "@/lib/auth";
import { getVoiceProfileClientState } from "@/lib/voice-foundations";

export default async function VoiceDnaPage() {
  const user = await getCurrentUser();
  const voiceProfile = user?.voiceProfile ?? null;
  const sampleCount = voiceProfile?.samplePosts.length ?? 0;
  const excludedCount = voiceProfile?.excludedPosts.length ?? 0;
  const shouldShowImportBanner =
    user?.linkedinActivityLevel === "regularly" && sampleCount < 3 && excludedCount === 0;
  const hasRenderableProfile = Boolean(
    voiceProfile &&
      (voiceProfile.foundationKey || voiceProfile.traits.length > 0 || sampleCount >= 2)
  );

  return (
    <section className="space-y-6">
      {shouldShowImportBanner && (
        <div className="rounded-2xl border border-brand/20 bg-brand-light/40 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand">
                Import your past LinkedIn posts to train your Voice DNA faster
              </p>
              <p className="mt-1 text-sm text-muted">
                Upload your LinkedIn Posts.csv and review each post one by one.
              </p>
            </div>
            <Link
              href="/voice-dna/import"
              className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand/90"
            >
              Import posts
            </Link>
          </div>
        </div>
      )}

      <VoiceDnaClient
        initialProfile={hasRenderableProfile ? getVoiceProfileClientState(voiceProfile) : null}
        initialUserType={user?.userType ?? null}
        initialLinkedinActivityLevel={user?.linkedinActivityLevel ?? null}
      />
    </section>
  );
}
