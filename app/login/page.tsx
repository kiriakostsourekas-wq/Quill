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
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#F4F6F7] px-6 py-28 sm:py-12">
      <div className="absolute inset-x-0 top-5 px-6">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border border-white/80 bg-[#FFFFFF]/88 px-5 shadow-[0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <Link href="/" className="text-sm font-bold tracking-[-0.02em] text-[#15161A]">
            Quill AI
          </Link>
          <Link href="/" className="text-xs font-medium text-slate-600 transition hover:text-brand">
            Back home
          </Link>
        </div>
      </div>

      <div className="w-full max-w-md rounded-[30px] border border-white bg-[#FFFFFF] p-7 shadow-[0_28px_80px_rgba(15,23,42,0.12)] sm:p-8">
        <div className="flex flex-col items-center text-center">
          <QuillLogo />
          <h1 className="mt-7 text-2xl font-extrabold tracking-[-0.04em] text-[#15161A] sm:text-3xl">
            Continue with Quill AI.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Join the free beta with LinkedIn. You can connect X once you’re inside.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 space-y-3">
          <form action="/api/auth/linkedin" method="post">
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(83,74,183,0.2)] transition hover:-translate-y-0.5 hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2"
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
