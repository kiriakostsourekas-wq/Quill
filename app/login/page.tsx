import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { QuillLogo } from "@/components/quill-logo";

const errorMessages: Record<string, string> = {
  linkedin_not_configured:
    "LinkedIn sign-in is not configured correctly in production. Check LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and NEXT_PUBLIC_APP_URL in Vercel.",
  linkedin_denied: "LinkedIn sign-in was cancelled before it completed.",
  linkedin_auth:
    "LinkedIn sign-in failed after the provider callback. Check the callback logs in Vercel and confirm the LinkedIn app products and secret are correct.",
  twitter_not_configured:
    "X sign-in is not configured correctly in production. TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET is missing in Vercel.",
  twitter_denied: "X sign-in was cancelled before it completed.",
  twitter_auth:
    "X sign-in failed after the provider callback. Check the callback logs in Vercel and confirm the X app credentials are correct.",
  account_limit:
    "Beta access currently includes LinkedIn and X connection support for all users.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.onboardingCompleted ? "/dashboard" : "/onboarding");

  const errorMessage = searchParams?.error ? errorMessages[searchParams.error] : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F3F4F6] px-6 py-12">
      <div className="quill-card w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          <QuillLogo />
          <h1 className="mt-6 text-2xl font-semibold text-ink">Continue with Quill.</h1>
          <p className="mt-2 text-sm text-muted">
            Join the free beta with LinkedIn. You can connect X once you’re inside.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 space-y-3">
          <form action="/api/auth/linkedin" method="post">
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand/90"
            >
              Continue with LinkedIn
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-muted">
          By signing in you agree to our{" "}
          <Link className="text-brand hover:underline" href="/terms">
            Terms
          </Link>{" "}
          and{" "}
          <a
            className="text-brand hover:underline"
            href="https://quill-ai.dev/privacy-policy"
            target="_blank"
            rel="noreferrer"
          >
            Privacy Policy
          </a>
          .
        </p>

        <p className="mt-4 text-center text-sm text-muted">
          Prefer to start from the public home page?{" "}
          <Link className="font-medium text-brand hover:underline" href="/">
            Go home
          </Link>
        </p>
      </div>
    </main>
  );
}
