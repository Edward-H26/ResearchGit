export type DashboardOnboardingStep = {
  title: string;
  body: string;
  focus: string;
  action: string;
};

export const FIRST_ONBOARDING_STEP: DashboardOnboardingStep = {
  title: "Account and author match",
  body: "Google sign-in creates your ResearchGit account, then the lookup links it to one CHI 2026 author profile.",
  focus: "Author lookup and dashboard identity",
  action: "Confirm the CHI record that matches the paper record you want to use.",
};

export const ONBOARDING_STEPS: DashboardOnboardingStep[] = [
  FIRST_ONBOARDING_STEP,
  {
    title: "Publications",
    body: "Review your CHI papers, unfold descriptions when needed, and select up to five papers to ground a new idea.",
    focus: "My Publications",
    action:
      "Open descriptions only when you need the abstract, then select the strongest source papers.",
  },
  {
    title: "Recommendations",
    body: "Use recommended papers, topics, and collaborator profiles to find adjacent directions beyond your own work.",
    focus: "Topics and collaborators",
    action: "Open collaborator chips to inspect related work before joining a topic.",
  },
  {
    title: "Idea generation",
    body: "Generate ideas from selected papers or from your full author history, then reopen drafts from the left rail.",
    focus: "My Ideas",
    action:
      "Start from selected papers for a focused draft or use all experience for a broader draft.",
  },
  {
    title: "Draft canvas",
    body: "Develop hypotheses, methods, novelty, and citations with sticky notes, resizing, search, AI enhancement, and AI suggested themes.",
    focus: "Draft canvas",
    action:
      "Move, resize, search, and edit notes before using AI suggested themes to organize the canvas.",
  },
  {
    title: "Marketplace feedback",
    body: "Publish for feedback, collect comments, and continue improving the idea through saved versions.",
    focus: "Marketplace canvas",
    action: "Publish when the draft is ready for feedback, then use comments to guide iteration.",
  },
];

const ONBOARDING_SESSION_PREFIX = "researchgit:onboarding-shown";

function onboardingSessionStorageKey(authorNormalizedName: string, onboardingKey: string): string {
  return `${ONBOARDING_SESSION_PREFIX}:${authorNormalizedName}:${onboardingKey}`;
}

export function hasOnboardingShownThisSession(
  authorNormalizedName: string,
  onboardingKey: string | null,
): boolean {
  if (!onboardingKey) return false;
  return (
    window.sessionStorage.getItem(
      onboardingSessionStorageKey(authorNormalizedName, onboardingKey),
    ) === "1"
  );
}

export function markOnboardingShownThisSession(
  authorNormalizedName: string,
  onboardingKey: string | null,
) {
  if (!onboardingKey) return;
  window.sessionStorage.setItem(
    onboardingSessionStorageKey(authorNormalizedName, onboardingKey),
    "1",
  );
}
