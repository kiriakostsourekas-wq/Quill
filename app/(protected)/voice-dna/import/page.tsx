import { VoiceDnaImportClient } from "@/components/app/voice-dna-import-client";
import { getCurrentUser } from "@/lib/auth";
import { getVoiceProfileStrength } from "@/lib/voice-foundations";

export default async function VoiceDnaImportPage() {
  const user = await getCurrentUser();
  const profile = user?.voiceProfile ?? null;
  const initialStrength = profile ? getVoiceProfileStrength(profile).state : "weak";
  const initialSampleCount = profile?.samplePosts.length ?? 0;

  return (
    <VoiceDnaImportClient
      userId={user?.id ?? "anonymous"}
      initialStrength={initialStrength}
      initialSampleCount={initialSampleCount}
    />
  );
}
