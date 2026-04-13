"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QuillLogo } from "@/components/quill-logo";
import { Button } from "@/components/ui/button";

const useCaseOptions = [
  "I want to grow my personal brand",
  "I manage social media for clients",
  "I'm a founder posting about my startup",
  "I want to post more consistently",
  "Just exploring",
];

const postingFrequencyOptions = [
  "Never / just starting out",
  "A few times a month",
  "1-2 times a week",
  "Daily or more",
];

type OnboardingClientProps = {
  initialEmail: string;
};

export function OnboardingClient({ initialEmail }: OnboardingClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [useCase, setUseCase] = useState("");
  const [postingFreq, setPostingFreq] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const progress = useMemo(() => `${(step / 3) * 100}%`, [step]);

  async function finishSetup() {
    setSubmitting(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useCase,
          postingFreq,
          email,
          marketingConsent,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to finish onboarding");
      }

      router.push("/dashboard?welcome=onboarding");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to finish onboarding");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-2xl items-center justify-center">
        <div className="quill-card w-full p-8 sm:p-10">
          <div className="flex justify-center">
            <QuillLogo />
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Step {step} of 3</span>
              <span>{step === 1 ? "Getting started" : step === 2 ? "Your posting habits" : "Stay in touch"}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-brand-light">
              <div
                className="h-2 rounded-full bg-brand transition-all"
                style={{ width: progress }}
              />
            </div>
          </div>

          {step === 1 && (
            <section className="mt-10 space-y-6">
              <div>
                <h1 className="text-3xl font-semibold text-ink">What brings you to Quill?</h1>
                <p className="mt-2 text-sm text-muted">Pick the option that fits you best.</p>
              </div>
              <div className="space-y-3">
                {useCaseOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setUseCase(option)}
                    className={`w-full rounded-xl border px-4 py-4 text-left text-sm transition ${
                      useCase === option
                        ? "border-brand bg-brand-light text-brand"
                        : "border-line bg-white text-ink hover:border-brand/30"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <Button className="w-full" onClick={() => setStep(2)} disabled={!useCase}>
                Continue →
              </Button>
            </section>
          )}

          {step === 2 && (
            <section className="mt-10 space-y-6">
              <div>
                <h1 className="text-3xl font-semibold text-ink">How often do you currently post?</h1>
                <p className="mt-2 text-sm text-muted">This helps us tailor the early experience.</p>
              </div>
              <div className="space-y-3">
                {postingFrequencyOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPostingFreq(option)}
                    className={`w-full rounded-xl border px-4 py-4 text-left text-sm transition ${
                      postingFreq === option
                        ? "border-brand bg-brand-light text-brand"
                        : "border-line bg-white text-ink hover:border-brand/30"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)} disabled={!postingFreq}>
                  Continue →
                </Button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="mt-10 space-y-6">
              <div>
                <h1 className="text-3xl font-semibold text-ink">What&apos;s your email?</h1>
                <p className="mt-2 text-sm text-muted">
                  We use it for a direct welcome note and important product updates.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="quill-input"
                  placeholder="you@example.com"
                />
                <p className="text-sm leading-6 text-muted">
                  The founder (Kyriakos) will personally email you a welcome note and occasional
                  product updates. No spam.
                </p>
                <label className="flex items-start gap-3 rounded-lg border border-line px-4 py-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(event) => setMarketingConsent(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-line text-brand focus:ring-brand/20"
                  />
                  <span>Send me tips on growing my audience</span>
                </label>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={finishSetup} disabled={submitting}>
                  {submitting ? "Finishing..." : "Finish setup →"}
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
