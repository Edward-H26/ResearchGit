export type DashboardOnboardingStep = {
  label: string;
  title: string;
  body: string;
  location: string;
  useWhen: string;
  action: string;
  next: string;
};

export const FIRST_ONBOARDING_STEP: DashboardOnboardingStep = {
  label: "Start",
  title: "Match your CHI identity",
  body: "Use Google sign-in to create your account, then match yourself to one CHI 2026 author record before any workspace opens.",
  location: "Landing page and author lookup",
  useWhen:
    "Use this first so recommendations, drafts, comments, and topic activity belong to the right author.",
  action: "Search your CHI author name, confirm the paper record, and continue to the dashboard.",
  next: "The dashboard becomes your personal route into papers, ideas, topics, and canvases.",
};

export const ONBOARDING_STEPS: DashboardOnboardingStep[] = [
  FIRST_ONBOARDING_STEP,
  {
    label: "Papers",
    title: "Scan your CHI papers",
    body: "Start with your own CHI 2026 publications. The folded description keeps the page compact while still letting you inspect abstracts when needed.",
    location: "My Publications",
    useWhen: "Use this section when you want a draft grounded in specific source papers.",
    action:
      "Open a description, compare the paper context, and select up to five papers that should seed the idea.",
    next: "Selected papers unlock a more focused idea generation path.",
  },
  {
    label: "Drafts",
    title: "Generate from selected papers",
    body: "Use the Publications section to turn selected CHI papers into a focused private draft.",
    location: "My Publications",
    useWhen: "Use selected papers when you want a draft grounded in specific source records.",
    action: "Select up to five papers, then choose Generate draft.",
    next: "Draft cards lead into a private canvas where you can shape the idea before publishing.",
  },
  {
    label: "Topics",
    title: "Explore broader sessions",
    body: "Broader topics are session groups from the CHI 2026 data. They work like a conference map for finding adjacent papers and communities.",
    location: "Broader topics",
    useWhen: "Use this when you want directions outside your immediate paper list.",
    action:
      "Click Generate more to search by keywords, review the generated topic cards, and pass or join them.",
    next: "Joining a topic turns the session card into the direct canvas entry point.",
  },
  {
    label: "Canvas",
    title: "Join a shared topic canvas",
    body: "A joined topic opens a shared workspace with a sticky note area and same-session paper anchors.",
    location: "Topic workspace and topic canvas",
    useWhen: "Use this when you want to think with other researchers around one session theme.",
    action:
      "Join a topic, scan the session papers, then open the canvas when you are ready to add notes.",
    next: "The canvas is where the public thinking and clustering happens.",
  },
  {
    label: "Notes",
    title: "Build with sticky notes",
    body: "Sticky notes capture hypotheses, methods, novelty, concerns, and paper links. Search jumps to notes, and AI assist can refine a selected note.",
    location: "Draft canvas or topic canvas",
    useWhen:
      "Use notes when the idea is still fluid and should be spatial, editable, and collaborative.",
    action:
      "Add a note, drag it near related notes, search it from the sidebar, then use Enhance sticky with AI when wording needs refinement.",
    next: "Once the canvas has enough material, use synthesis and comments to move from notes to a proposal direction.",
  },
  {
    label: "Feedback",
    title: "Comment and synthesize",
    body: "Published ideas and topic canvases use comments for structured feedback. Topic canvases can also generate an analysis report from the accumulated notes.",
    location: "Idea detail page and topic canvas",
    useWhen:
      "Use comments for critique, related work, experiment ideas, and concerns after the core idea is visible.",
    action:
      "Post a typed comment, review the thread, then generate an analysis report when the canvas has enough notes.",
    next: "Use feedback and saved versions to keep iterating without losing the earlier draft state.",
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
