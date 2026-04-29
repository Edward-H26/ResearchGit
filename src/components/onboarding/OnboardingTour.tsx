"use client";

import { useEffect, useState, useTransition } from "react";

type Step = {
  readonly title: string;
  readonly body: string;
};

const STEPS: ReadonlyArray<Step> = [
  {
    title: "Pick an idea",
    body: "Your home deck shows 10 LLM-generated research ideas. Click a card to start exploring it.",
  },
  {
    title: "Add sticky-note feedback",
    body: "On the canvas, drop sticky notes labeled add (green), delete (red), or merge (purple). Drag to position; double-click empty space to create a new note.",
  },
  {
    title: "Revise with AI",
    body: "A later phase adds AI-assisted revision from your sticky-note feedback. For now, use the board to capture clear add, delete, and merge guidance for that future pass.",
  },
];

export type OnboardingTourProps = {
  open: boolean;
  onComplete: () => Promise<void>;
};

export function OnboardingTour({ open, onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const [closed, setClosed] = useState(!open);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setClosed(!open);
    if (open) {
      setStep(0);
    }
  }, [open]);

  if (closed) return null;

  const current = STEPS[step] ?? STEPS[0];
  if (!current) return null;
  const isLast = step === STEPS.length - 1;

  function close() {
    setClosed(true);
    startTransition(async () => {
      try {
        await onComplete();
      } catch {
        // Best-effort persistence; the modal still closes locally.
      }
    });
  }

  function advance() {
    if (isLast) {
      close();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-center gap-2" aria-hidden="true">
          {STEPS.map((stepDef, i) => (
            <div
              key={stepDef.title}
              className={`h-1.5 w-10 rounded-full transition ${
                i <= step ? "bg-neutral-950" : "bg-neutral-200"
              }`}
            />
          ))}
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{current.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">{current.body}</p>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="text-xs text-neutral-500 underline-offset-4 transition hover:text-neutral-900 hover:underline disabled:opacity-50"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={pending}
                className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={advance}
              disabled={pending}
              className="rounded-2xl bg-neutral-950 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
