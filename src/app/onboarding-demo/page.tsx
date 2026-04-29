import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { notFound } from "next/navigation";

async function noopComplete(): Promise<void> {
  "use server";
}

export default function OnboardingDemoPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-8">
      <p className="text-sm text-neutral-400">
        Onboarding tour demo (development only). The modal renders on top; the underlying page stays
        in place.
      </p>
      <OnboardingTour open onComplete={noopComplete} />
    </main>
  );
}
