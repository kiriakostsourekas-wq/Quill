import { VoiceDnaClient } from "@/components/app/voice-dna-client";
import { getCurrentUser } from "@/lib/auth";
import { getVoiceProfileClientState } from "@/lib/voice-foundations";

export default async function VoiceDnaPage() {
  const user = await getCurrentUser();

  return (
    <VoiceDnaClient
      initialProfile={getVoiceProfileClientState(user?.voiceProfile)}
      initialUserType={user?.userType ?? null}
      initialLinkedinActivityLevel={user?.linkedinActivityLevel ?? null}
    />
  );
}
