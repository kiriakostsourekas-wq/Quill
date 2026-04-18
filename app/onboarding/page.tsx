import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingClient } from "@/components/app/onboarding-client";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.onboardingCompleted) {
    redirect("/dashboard");
  }

  return <OnboardingClient />;
}
