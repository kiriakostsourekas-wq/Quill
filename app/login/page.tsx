import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { QuillLogo } from "@/components/quill-logo";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F3F4F6] px-6 py-12">
      <div className="quill-card w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          <QuillLogo />
          <h1 className="mt-6 text-2xl font-semibold text-ink">Continue with Quill.</h1>
          <p className="mt-2 text-sm text-muted">
            Use LinkedIn or X to create your account or sign back in.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <form action="/api/auth/linkedin" method="post">
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center rounded-md bg-[#0A66C2] px-4 text-sm font-medium text-white transition hover:bg-[#0958A8]"
            >
              Continue with LinkedIn
            </button>
          </form>

          <form action="/api/auth/twitter" method="post">
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center rounded-md bg-black px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Continue with X
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
            href="https://quill-ai-tool.vercel.app/privacy-policy"
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
