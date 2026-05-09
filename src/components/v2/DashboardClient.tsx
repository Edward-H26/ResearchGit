"use client";

import {
  AuthorRequiredFallback,
  DashboardHero,
  OnboardingDialog,
  PublicationsSection,
  TopicRecommendationsSection,
} from "@/components/v2/dashboard/DashboardSections";
import { dashboardIdeasFromState, ideasSignature } from "@/components/v2/dashboard/activity";
import {
  FIRST_ONBOARDING_STEP,
  ONBOARDING_STEPS,
  hasOnboardingShownThisSession,
  markOnboardingShownThisSession,
} from "@/components/v2/dashboard/onboarding";
import {
  INITIAL_TOPIC_COUNT,
  MAX_TOPIC_RECOMMENDATIONS,
  mergeTopicRecommendations,
  topicRecommendationsFromIds,
  visibleRecommendedTopics,
} from "@/components/v2/dashboard/topics";
import { buildTopicIdeaCard } from "@/lib/ideas";
import {
  type IdeaRecord,
  completeOnboarding as completeOnboardingForAuthor,
  createTopicIdeaFromCard,
  loadIdeaStoreState,
  subscribeToIdeaStore,
} from "@/lib/ideas/client-store";
import { getAuthorByName } from "@/lib/papers/catalog";
import {
  type RecommendedTopic,
  recommendAdditionalTopicsForAuthor,
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
        const currentIdeas = dashboardIdeasFromState(storeState, author.name);
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
        setIdeas((current) =>
          ideasSignature(current) === ideasSignature(currentIdeas) ? current : currentIdeas,
        );
        setJoinedTopicIds((current) =>
          current.join("|") === savedJoinedTopicIds.join("|") ? current : savedJoinedTopicIds,
        );
        setVisibleTopicCount((current) =>
          current === nextVisibleTopicCount ? current : nextVisibleTopicCount,
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
  }, [author, authoredRecommendedTopics, dismissedOnboardingAuthor, onboardingKey, showOnboarding]);

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
    let firstJoinedTopicId: string | null = null;

    for (const topicId of uniqueTopicIds) {
      const recommendation = findTopicRecommendation(topicId);
      if (!recommendation) continue;
      const created = await createTopicIdeaFromCard(
        buildTopicIdeaCard(recommendation.topic),
        currentAuthor.name,
      );
      if (!created) continue;
      firstJoinedTopicId ??= topicId;
    }

    if (!firstJoinedTopicId) return;
    const targetTopicId = firstJoinedTopicId;

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
    window.setTimeout(() => {
      document.getElementById(`topic-card-${targetTopicId}`)?.scrollIntoView({
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
          onGenerateSelected={generateSelected}
        />
        <TopicRecommendationsSection
          currentAuthor={currentAuthor}
          ideas={ideas}
          recommendedTopics={recommendedTopics}
          joinedTopicIds={joinedTopicIds}
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
