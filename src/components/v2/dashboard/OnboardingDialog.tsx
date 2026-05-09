"use client";

import type { DashboardOnboardingStep } from "@/components/v2/dashboard/onboarding";

type OnboardingDialogProps = {
  currentStep: DashboardOnboardingStep;
  currentStepIndex: number;
  stepCount: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
};

export function OnboardingDialog({
  currentStep,
  currentStepIndex,
  stepCount,
  isFirstStep,
  isLastStep,
  onPrevious,
  onNext,
  onComplete,
}: OnboardingDialogProps) {
  const progressMarkers = Array.from({ length: stepCount }, (_, index) => ({
    id: `tutorial-progress-${index + 1}`,
    isComplete: index <= currentStepIndex,
  }));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/30 p-3 sm:p-5">
      <dialog
        aria-labelledby="onboarding-title"
        aria-modal="true"
        data-tutorial-dialog
        open={true}
        className="relative m-0 block max-h-[calc(100vh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-[28px] border-0 bg-white p-4 text-neutral-950 shadow-[0_24px_100px_rgba(0,0,0,0.24)] sm:max-h-[calc(100vh-2.5rem)] sm:p-6 lg:max-w-4xl"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Setup tutorial
            </p>
            <h2 id="onboarding-title" className="mt-2 text-2xl font-semibold sm:text-3xl">
              ResearchGit workflow
            </h2>
          </div>
          <span className="w-fit rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
            Step {currentStepIndex + 1} of {stepCount}
          </span>
        </div>

        <div
          className="mt-5 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${stepCount}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {progressMarkers.map((marker) => (
            <span
              key={marker.id}
              className={`h-2 rounded-full ${marker.isComplete ? "bg-neutral-950" : "bg-neutral-200"}`}
            />
          ))}
        </div>

        <article className="mt-5 rounded-[24px] border border-neutral-200 bg-[#fcfbf8] p-4 sm:mt-6 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Guided workflow
            </p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600">
              {currentStep.label}
            </span>
          </div>
          <h3 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            {currentStep.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">{currentStep.body}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Where
              </p>
              <p className="mt-2 text-sm font-semibold text-neutral-950">{currentStep.location}</p>
            </div>
            <div className="rounded-[18px] border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Use when
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700">{currentStep.useWhen}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[18px] border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Do this
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700">{currentStep.action}</p>
            </div>
            <div className="rounded-[18px] border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Next
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700">{currentStep.next}</p>
            </div>
          </div>
        </article>

        <div className="mt-5 grid gap-3 sm:mt-6 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={onPrevious}
            disabled={isFirstStep}
            className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 disabled:border-neutral-200 disabled:text-neutral-300"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={isLastStep ? onComplete : onNext}
            className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            {isLastStep ? "Done" : "Next step"}
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="rounded-full px-5 py-3 text-sm font-semibold text-neutral-600 transition hover:text-neutral-950"
          >
            Skip tutorial
          </button>
        </div>
      </dialog>
    </div>
  );
}
