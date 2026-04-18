"use client";

import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QuillLogo } from "@/components/quill-logo";
import { Button } from "@/components/ui/button";
import { cn, safeJson } from "@/lib/utils";

const linkedinActivityOptions = [
  { value: "never", label: "I've never posted" },
  { value: "occasionally", label: "I post occasionally" },
  { value: "regularly", label: "I post regularly" },
] as const;

const contentGoalOptions = [
  { value: "brand", label: "Build my personal brand" },
  { value: "clients", label: "Get clients or leads" },
  { value: "knowledge", label: "Share knowledge in my field" },
  { value: "job", label: "Find a new job or opportunity" },
] as const;

const communicationStyleOptions = [
  { value: "direct", label: "Direct and blunt" },
  { value: "thoughtful", label: "Thoughtful and measured" },
  { value: "energetic", label: "Energetic and enthusiastic" },
  { value: "warm", label: "Warm and personal" },
] as const;

type LinkedinActivityLevel = (typeof linkedinActivityOptions)[number]["value"];
type ContentGoal = (typeof contentGoalOptions)[number]["value"];
type CommunicationStyle = (typeof communicationStyleOptions)[number]["value"];
type StepId =
  | "linkedinActivityLevel"
  | "mainTopic"
  | "contentGoal"
  | "communicationStyle"
  | "contrarianBelief";

type FormState = {
  linkedinActivityLevel: LinkedinActivityLevel | "";
  mainTopic: string;
  contentGoal: ContentGoal | "";
  communicationStyle: CommunicationStyle | "";
  contrarianBelief: string;
};

type CompletionResponse = {
  error?: string;
};

function getStepIds(activityLevel: LinkedinActivityLevel | "") {
  const steps: StepId[] = ["linkedinActivityLevel", "mainTopic", "contentGoal"];

  if (activityLevel === "never" || activityLevel === "occasionally") {
    steps.push("communicationStyle");
  }

  if (activityLevel === "never") {
    steps.push("contrarianBelief");
  }

  return steps;
}

export function OnboardingClient() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    linkedinActivityLevel: "",
    mainTopic: "",
    contentGoal: "",
    communicationStyle: "",
    contrarianBelief: "",
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [submitting, setSubmitting] = useState(false);

  const steps = getStepIds(form.linkedinActivityLevel);
  const currentStep = steps[stepIndex] ?? steps[0];
  const totalSteps = steps.length;

  async function completeOnboarding(nextForm: FormState) {
    setSubmitting(true);

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinActivityLevel: nextForm.linkedinActivityLevel,
          mainTopic: nextForm.mainTopic.trim(),
          contentGoal: nextForm.contentGoal,
          communicationStyle:
            nextForm.linkedinActivityLevel === "never" ||
            nextForm.linkedinActivityLevel === "occasionally"
              ? nextForm.communicationStyle
              : null,
          contrarianBelief:
            nextForm.linkedinActivityLevel === "never"
              ? nextForm.contrarianBelief.trim()
              : null,
        }),
      });

      const data = await safeJson<CompletionResponse>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to complete onboarding");
      }

      router.replace("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to complete onboarding");
    } finally {
      setSubmitting(false);
    }
  }

  function advance(nextForm: FormState) {
    const nextSteps = getStepIds(nextForm.linkedinActivityLevel);

    if (stepIndex >= nextSteps.length - 1) {
      void completeOnboarding(nextForm);
      return;
    }

    setDirection("forward");
    setStepIndex((current) => Math.min(current + 1, nextSteps.length - 1));
  }

  function goBack() {
    if (submitting) return;

    if (stepIndex === 0) {
      router.back();
      return;
    }

    setDirection("backward");
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  function selectLinkedinActivityLevel(linkedinActivityLevel: LinkedinActivityLevel) {
    const nextForm: FormState = {
      ...form,
      linkedinActivityLevel,
      communicationStyle:
        linkedinActivityLevel === "regularly" ? "" : form.communicationStyle,
      contrarianBelief:
        linkedinActivityLevel === "never" ? form.contrarianBelief : "",
    };

    setForm(nextForm);
    advance(nextForm);
  }

  function selectContentGoal(contentGoal: ContentGoal) {
    const nextForm = { ...form, contentGoal };
    setForm(nextForm);
    advance(nextForm);
  }

  function selectCommunicationStyle(communicationStyle: CommunicationStyle) {
    const nextForm = { ...form, communicationStyle };
    setForm(nextForm);
    advance(nextForm);
  }

  function continueFromMainTopic() {
    const nextForm = {
      ...form,
      mainTopic: form.mainTopic.trim(),
    };

    if (!nextForm.mainTopic) return;

    setForm(nextForm);
    advance(nextForm);
  }

  function continueFromContrarianBelief() {
    const nextForm = {
      ...form,
      contrarianBelief: form.contrarianBelief.trim(),
    };

    setForm(nextForm);
    advance(nextForm);
  }

  function renderOptionList<T extends string>(
    options: readonly { value: T; label: string }[],
    value: T | "",
    onSelect: (selected: T) => void
  ) {
    return (
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            disabled={submitting}
            className={cn(
              "w-full rounded-2xl border px-5 py-5 text-left text-base font-medium transition duration-200",
              "hover:border-brand/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20",
              value === option.value
                ? "border-brand bg-brand-light text-brand"
                : "border-line bg-surface text-ink"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas px-6 py-8 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-light/80 via-brand-light/30 to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-28 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-20 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="gap-2 px-0 text-muted hover:bg-transparent hover:text-ink"
            onClick={goBack}
            disabled={submitting}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="text-sm font-medium text-muted">
            Step {stepIndex + 1} of {totalSteps}
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/70">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="quill-card w-full max-w-2xl overflow-hidden rounded-[28px] p-8 sm:p-12">
            <div className="flex justify-center">
              <QuillLogo />
            </div>

            <div
              key={currentStep}
              className={cn(
                "mt-12 space-y-8",
                "animate-in fade-in duration-300",
                direction === "forward" ? "slide-in-from-right-4" : "slide-in-from-left-4"
              )}
            >
              {currentStep === "linkedinActivityLevel" && (
                <section className="space-y-8">
                  <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                    How active are you on LinkedIn right now?
                  </h1>
                  {renderOptionList(
                    linkedinActivityOptions,
                    form.linkedinActivityLevel,
                    selectLinkedinActivityLevel
                  )}
                </section>
              )}

              {currentStep === "mainTopic" && (
                <section className="space-y-8">
                  <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                    What&apos;s your main topic or area of expertise?
                  </h1>
                  <div className="space-y-4">
                    <input
                      autoFocus
                      maxLength={100}
                      value={form.mainTopic}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, mainTopic: event.target.value }))
                      }
                      className="quill-input h-14 rounded-2xl px-4 text-base"
                      aria-label="Main topic"
                    />
                    <Button
                      className="w-full h-12 rounded-xl"
                      onClick={continueFromMainTopic}
                      disabled={submitting || !form.mainTopic.trim()}
                    >
                      Continue
                    </Button>
                  </div>
                </section>
              )}

              {currentStep === "contentGoal" && (
                <section className="space-y-8">
                  <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                    What&apos;s your main goal with LinkedIn content?
                  </h1>
                  {renderOptionList(contentGoalOptions, form.contentGoal, selectContentGoal)}
                </section>
              )}

              {currentStep === "communicationStyle" && (
                <section className="space-y-8">
                  <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                    How would people who know you describe your communication style?
                  </h1>
                  {renderOptionList(
                    communicationStyleOptions,
                    form.communicationStyle,
                    selectCommunicationStyle
                  )}
                </section>
              )}

              {currentStep === "contrarianBelief" && (
                <section className="space-y-8">
                  <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                    What&apos;s one belief you hold about your field that most people would disagree
                    with?
                  </h1>
                  <div className="space-y-4">
                    <textarea
                      autoFocus
                      maxLength={300}
                      value={form.contrarianBelief}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          contrarianBelief: event.target.value,
                        }))
                      }
                      className="quill-textarea min-h-[200px] rounded-2xl px-4 text-base"
                      aria-label="Contrarian belief"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        variant="outline"
                        className="h-12 flex-1 rounded-xl"
                        onClick={continueFromContrarianBelief}
                        disabled={submitting}
                      >
                        Skip
                      </Button>
                      <Button
                        className="h-12 flex-1 rounded-xl"
                        onClick={continueFromContrarianBelief}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Finishing
                          </span>
                        ) : (
                          "Continue"
                        )}
                      </Button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
