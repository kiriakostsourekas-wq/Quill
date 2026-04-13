import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <AppShell
      user={{
        name: user.name ?? user.email.split("@")[0],
        email: user.email,
        avatar: user.avatar ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
