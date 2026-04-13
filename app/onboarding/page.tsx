import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingClient } from "@/components/app/onboarding-client";

function getInitialEmail(email: string) {
  return email.endsWith("@users.quill.local") ? "" : email;
}

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingCompleted) {
    redirect("/dashboard");
  }

  return <OnboardingClient initialEmail={getInitialEmail(user.email)} />;
}
