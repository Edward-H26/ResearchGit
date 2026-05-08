"use client";

import {
  AuthorRequiredFallback,
  DashboardHero,
  IdeaWorkspaceSection,
  OnboardingDialog,
  PublicationsSection,
  TopicRecommendationsSection,
} from "@/components/v2/dashboard/DashboardSections";
import {
  FIRST_ONBOARDING_STEP,
  ONBOARDING_STEPS,
  hasOnboardingShownThisSession,
  markOnboardingShownThisSession,
} from "@/components/v2/dashboard/onboarding";
import {
  INITIAL_TOPIC_COUNT,
  MAX_TOPIC_RECOMMENDATIONS,
  visibleRecommendedTopics,
} from "@/components/v2/dashboard/topics";
import { TOPIC_IDEA_CARD_PREFIX, buildTopicIdeaCard } from "@/lib/ideas";
import {
  type IdeaRecord,
  type IdeaStoreState,
  completeOnboarding as completeOnboardingForAuthor,
  createTopicIdeaFromCard,
  loadIdeaStoreState,
  subscribeToIdeaStore,
} from "@/lib/ideas/client-store";
import { getIdeasForAuthorFromState } from "@/lib/ideas/store";
import { getAuthorByName } from "@/lib/papers/catalog";
import {
  type RecommendedTopic,
  recommendAdditionalTopicsForAuthor,
  recommendTopicByIdForAuthor,
  recommendTopicsForAuthor,
} from "@/lib/recommendation";
import { dashboardHref, ideaGenerationHref } from "@/lib/routes";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type DashboardClientProps = {
  authorName: string | null;
  onboardingKey: string | null;
  showOnboarding: boolean;
  shouldPersistOnboarding: boolean;
};

function ideasSignature(ideas: ReadonlyArray<IdeaRecord>): string {
  return ideas
    .map(
      (idea) =>
        `${idea.id}:${idea.status}:${idea.updatedAt}:${idea.notes.length}:${idea.comments.length}`,
    )
    .join("|");
}

function mergeTopicRecommendations(
  primaryTopics: ReadonlyArray<RecommendedTopic>,
  generatedTopics: ReadonlyArray<RecommendedTopic>,
): RecommendedTopic[] {
  const seen = new Set<string>();
  return [...primaryTopics, ...generatedTopics].filter((recommendation) => {
    if (seen.has(recommendation.topic.id)) return false;
    seen.add(recommendation.topic.id);
    return true;
  });
}

function topicIdeaFromState(storeState: IdeaStoreState, topicId: string): IdeaRecord | null {
  const cardId = `${TOPIC_IDEA_CARD_PREFIX}${topicId}`;
  return storeState.ideas.find((idea) => idea.cardId === cardId) ?? null;
}

function topicRecommendationsFromIds(
  authorName: string,
  topicIds: ReadonlyArray<string>,
): RecommendedTopic[] {
  return topicIds
    .map((topicId) => recommendTopicByIdForAuthor(authorName, topicId))
    .filter((recommendation): recommendation is RecommendedTopic => recommendation !== null);
}

export function DashboardClient({
  authorName,
  onboardingKey,
  showOnboarding,
  shouldPersistOnboarding,
}: DashboardClientProps) {
  const router = useRouter();
  const author = useMemo(() => (authorName ? getAuthorByName(authorName) : null), [authorName]);
  const authorNormalizedName = author?.normalizedName ?? "";
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [dismissedOnboardingAuthor, setDismissedOnboardingAuthor] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [visibleTopicCount, setVisibleTopicCount] = useState(INITIAL_TOPIC_COUNT);
  const [topicKeywordQuery, setTopicKeywordQuery] = useState("");
  const [isTopicSearchOpen, setTopicSearchOpen] = useState(false);
  const [isGeneratingTopics, setGeneratingTopics] = useState(false);
  const [generatedTopicQuery, setGeneratedTopicQuery] = useState("");
  const [topicReviewRecommendations, setTopicReviewRecommendations] = useState<RecommendedTopic[]>(
    [],
  );
  const [selectedGeneratedTopicIds, setSelectedGeneratedTopicIds] = useState<string[]>([]);
  const [isTopicReviewOpen, setTopicReviewOpen] = useState(false);
  const [joinedTopicIds, setJoinedTopicIds] = useState<string[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [activeTopicIdea, setActiveTopicIdea] = useState<IdeaRecord | null>(null);

  const authoredPapers = useMemo(() => author?.papers.slice(0, 8) ?? [], [author]);
  const authoredRecommendedTopics = useMemo(
    () => (author ? recommendTopicsForAuthor(author.name, MAX_TOPIC_RECOMMENDATIONS) : []),
    [author],
  );
  const joinedRecommendedTopics = useMemo(
    () => (author ? topicRecommendationsFromIds(author.name, joinedTopicIds) : []),
    [author, joinedTopicIds],
  );
  const allRecommendedTopics = useMemo(
    () => mergeTopicRecommendations(authoredRecommendedTopics, joinedRecommendedTopics),
    [authoredRecommendedTopics, joinedRecommendedTopics],
  );
  const recommendedTopics = useMemo(
    () => visibleRecommendedTopics(allRecommendedTopics, visibleTopicCount),
    [allRecommendedTopics, visibleTopicCount],
  );

  useEffect(() => {
    let canceled = false;

    async function refreshDashboard() {
      if (!author) {
        setIdeas([]);
        setOnboardingOpen(false);
        return;
      }

      setOnboardingOpen((currentOpen) => {
        if (currentOpen) return true;
        const shouldOpen =
          showOnboarding &&
          dismissedOnboardingAuthor !== author.normalizedName &&
          !hasOnboardingShownThisSession(author.normalizedName, onboardingKey);
        if (shouldOpen) {
          markOnboardingShownThisSession(author.normalizedName, onboardingKey);
        }
        return shouldOpen;
      });

      try {
        const storeState = await loadIdeaStoreState();
        if (canceled) return;
        const currentIdeas = getIdeasForAuthorFromState(storeState, author.name).sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        );
        const savedTopicCount =
          storeState.topicRecommendationCountByAuthor[author.normalizedName] ?? INITIAL_TOPIC_COUNT;
        const savedJoinedTopicIds = storeState.joinedTopicIdsByAuthor[author.normalizedName] ?? [];
        const savedJoinedRecommendedTopics = topicRecommendationsFromIds(
          author.name,
          savedJoinedTopicIds,
        );
        const savedRecommendedTopicCount = mergeTopicRecommendations(
          authoredRecommendedTopics,
          savedJoinedRecommendedTopics,
        ).length;
        const nextVisibleTopicCount = Math.min(
          savedRecommendedTopicCount,
          Math.max(
            INITIAL_TOPIC_COUNT,
            savedTopicCount,
            authoredRecommendedTopics.length + savedJoinedTopicIds.length,
          ),
        );
        const nextSelectedTopicId =
          selectedTopicId && savedJoinedTopicIds.includes(selectedTopicId)
            ? selectedTopicId
            : (savedJoinedTopicIds[0] ?? null);
        setIdeas((current) =>
          ideasSignature(current) === ideasSignature(currentIdeas) ? current : currentIdeas,
        );
        setJoinedTopicIds((current) =>
          current.join("|") === savedJoinedTopicIds.join("|") ? current : savedJoinedTopicIds,
        );
        setVisibleTopicCount((current) =>
          current === nextVisibleTopicCount ? current : nextVisibleTopicCount,
        );
        setSelectedTopicId(nextSelectedTopicId);
        setActiveTopicIdea(
          nextSelectedTopicId ? topicIdeaFromState(storeState, nextSelectedTopicId) : null,
        );
      } catch {
        if (!canceled) {
          setIdeas([]);
        }
      }
    }

    void refreshDashboard();
    const unsubscribe = subscribeToIdeaStore(refreshDashboard);

    return () => {
      canceled = true;
      unsubscribe();
    };
  }, [
    author,
    authoredRecommendedTopics,
    dismissedOnboardingAuthor,
    onboardingKey,
    selectedTopicId,
    showOnboarding,
  ]);

  useEffect(() => {
    if (!authorNormalizedName) {
      setVisibleTopicCount(INITIAL_TOPIC_COUNT);
      return;
    }
    setVisibleTopicCount(INITIAL_TOPIC_COUNT);
    setGeneratedTopicQuery("");
    setGeneratingTopics(false);
    setTopicReviewRecommendations([]);
    setSelectedGeneratedTopicIds([]);
    setTopicReviewOpen(false);
    setTopicKeywordQuery("");
    setTopicSearchOpen(false);
    setJoinedTopicIds([]);
    setSelectedTopicId(null);
    setActiveTopicIdea(null);
  }, [authorNormalizedName]);

  if (!author) {
    return <AuthorRequiredFallback />;
  }

  const currentAuthor = author;
  const currentTutorialStep = ONBOARDING_STEPS[tutorialStepIndex] ?? FIRST_ONBOARDING_STEP;
  const isFirstTutorialStep = tutorialStepIndex === 0;
  const isLastTutorialStep = tutorialStepIndex === ONBOARDING_STEPS.length - 1;

  function togglePaper(paperId: string) {
    setSelectedPaperIds((current) => {
      if (current.includes(paperId)) return current.filter((id) => id !== paperId);
      if (current.length >= 5) return current;
      return [...current, paperId];
    });
  }

  function generateSelected() {
    router.push(ideaGenerationHref(currentAuthor.name, "selected", selectedPaperIds));
  }

  function findTopicRecommendation(topicId: string): RecommendedTopic | null {
    return (
      [...allRecommendedTopics, ...topicReviewRecommendations].find(
        (candidate) => candidate.topic.id === topicId,
      ) ?? null
    );
  }

  async function joinTopics(topicIds: ReadonlyArray<string>) {
    const uniqueTopicIds = [...new Set(topicIds)];
    let firstJoinedTopic: { topicId: string; idea: IdeaRecord } | null = null;

    for (const topicId of uniqueTopicIds) {
      const recommendation = findTopicRecommendation(topicId);
      if (!recommendation) continue;
      const created = await createTopicIdeaFromCard(
        buildTopicIdeaCard(recommendation.topic),
        currentAuthor.name,
      );
      if (!created) continue;
      firstJoinedTopic ??= { topicId, idea: created };
    }

    if (!firstJoinedTopic) return;

    setJoinedTopicIds((current) => {
      const next = [...current];
      for (const topicId of uniqueTopicIds) {
        if (!next.includes(topicId)) next.push(topicId);
      }
      return next;
    });
    setVisibleTopicCount((current) =>
      Math.max(
        current,
        authoredRecommendedTopics.length + joinedTopicIds.length + uniqueTopicIds.length,
      ),
    );
    setSelectedTopicId(firstJoinedTopic.topicId);
    setActiveTopicIdea(firstJoinedTopic.idea);
    window.setTimeout(() => {
      document.getElementById(`topic-card-${firstJoinedTopic.topicId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  async function joinTopic(topicId: string) {
    await joinTopics([topicId]);
  }

  async function generateMoreTopics() {
    if (!isTopicSearchOpen) {
      setTopicSearchOpen(true);
      window.setTimeout(() => {
        document.getElementById("topic-keyword-search")?.focus();
      }, 0);
      return;
    }

    const trimmedQuery = topicKeywordQuery.trim();
    if (trimmedQuery.length === 0) return;

    const generatedTopics = recommendAdditionalTopicsForAuthor(
      currentAuthor.name,
      trimmedQuery,
      MAX_TOPIC_RECOMMENDATIONS,
    );
    setGeneratingTopics(true);
    setGeneratedTopicQuery(trimmedQuery);
    setTopicReviewRecommendations(generatedTopics);
    setSelectedGeneratedTopicIds([]);
    setTopicReviewOpen(true);
    setGeneratingTopics(false);
  }

  function closeTopicReview() {
    setTopicReviewOpen(false);
    setSelectedGeneratedTopicIds([]);
  }

  function generateNewTopicSearch() {
    closeTopicReview();
    setTopicSearchOpen(true);
    window.setTimeout(() => {
      document.getElementById("topic-keyword-search")?.focus();
    }, 0);
  }

  function toggleGeneratedTopic(topicId: string) {
    setSelectedGeneratedTopicIds((current) =>
      current.includes(topicId)
        ? current.filter((candidate) => candidate !== topicId)
        : [...current, topicId],
    );
  }

  async function confirmGeneratedTopics() {
    if (selectedGeneratedTopicIds.length === 0) return;
    await joinTopics(selectedGeneratedTopicIds);
    closeTopicReview();
  }

  async function completeOnboarding() {
    setDismissedOnboardingAuthor(currentAuthor.normalizedName);
    markOnboardingShownThisSession(currentAuthor.normalizedName, onboardingKey);
    await completeOnboardingForAuthor(currentAuthor.normalizedName);
    if (shouldPersistOnboarding) {
      await fetch("/api/onboarding/complete", { method: "POST" });
    }
    setOnboardingOpen(false);
    router.replace(dashboardHref(currentAuthor.name), { scroll: false });
  }

  function showPreviousTutorialStep() {
    setTutorialStepIndex((current) => Math.max(0, current - 1));
  }

  function showNextTutorialStep() {
    setTutorialStepIndex((current) => Math.min(ONBOARDING_STEPS.length - 1, current + 1));
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4efe7_0%,#f8f7f2_48%,#ffffff_100%)] px-4 py-6 text-neutral-950 sm:px-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <DashboardHero author={currentAuthor} />
        <PublicationsSection
          papers={authoredPapers}
          selectedPaperIds={selectedPaperIds}
          onTogglePaper={togglePaper}
        />
        <IdeaWorkspaceSection
          authorName={currentAuthor.name}
          ideas={ideas}
          selectedPaperCount={selectedPaperIds.length}
          onGenerateSelected={generateSelected}
        />
        <TopicRecommendationsSection
          currentAuthor={currentAuthor}
          recommendedTopics={recommendedTopics}
          selectedTopicId={selectedTopicId}
          activeTopicIdea={activeTopicIdea}
          topicKeywordQuery={topicKeywordQuery}
          isTopicSearchOpen={isTopicSearchOpen}
          isGeneratingTopics={isGeneratingTopics}
          generatedTopicQuery={generatedTopicQuery}
          isTopicReviewOpen={isTopicReviewOpen}
          topicReviewRecommendations={topicReviewRecommendations}
          selectedGeneratedTopicIds={selectedGeneratedTopicIds}
          onTopicKeywordQueryChange={setTopicKeywordQuery}
          onGenerateMoreTopics={() => void generateMoreTopics()}
          onJoinTopic={(topicId) => void joinTopic(topicId)}
          onCloseTopicReview={closeTopicReview}
          onGenerateNewTopicSearch={generateNewTopicSearch}
          onToggleGeneratedTopic={toggleGeneratedTopic}
          onConfirmGeneratedTopics={() => void confirmGeneratedTopics()}
        />
      </div>

      {onboardingOpen ? (
        <OnboardingDialog
          currentStep={currentTutorialStep}
          currentStepIndex={tutorialStepIndex}
          stepCount={ONBOARDING_STEPS.length}
          isFirstStep={isFirstTutorialStep}
          isLastStep={isLastTutorialStep}
          onPrevious={showPreviousTutorialStep}
          onNext={showNextTutorialStep}
          onComplete={() => void completeOnboarding()}
        />
      ) : null}
    </main>
  );
}
