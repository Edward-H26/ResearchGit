import AxeBuilder from "@axe-core/playwright";
import { type APIRequestContext, type Page, expect, test } from "@playwright/test";

const E2E_AUTHOR_NAMES = ["Yun Huang", "Yiren Liu", "Hyanghee Park", "Ziyi Zhang"] as const;
const createdIdeaOwners = new Map<string, string>();

async function cleanupE2EWorkflowIdeas(request: APIRequestContext) {
  const ideasById = new Map<
    string,
    { id: string; ownerName: string; title: string; cardId: string }
  >();
  for (const authorName of E2E_AUTHOR_NAMES) {
    const authorSlug = authorName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const clearTopicsResponse = await request.post("/api/ideas/store", {
      data: {
        action: "clearJoinedTopics",
        payload: { normalizedAuthorName: authorSlug },
      },
    });
    expect(clearTopicsResponse.ok()).toBe(true);

    const params = new URLSearchParams({ author: authorName });
    const response = await request.get(`/api/ideas/store?${params.toString()}`);
    expect(response.ok()).toBe(true);
    const state = (await response.json()) as {
      ideas: Array<{ id: string; ownerName: string; title: string; cardId: string }>;
    };
    for (const idea of state.ideas) {
      if (idea.title.startsWith("E2E workflow draft") || idea.cardId.startsWith("e2e-workflow-")) {
        ideasById.set(idea.id, idea);
      }
    }
  }

  for (const idea of ideasById.values()) {
    const cleanupResponse = await request.post("/api/ideas/store", {
      data: {
        action: "deleteIdea",
        payload: { ideaId: idea.id, actorName: idea.ownerName },
      },
    });
    expect(cleanupResponse.ok()).toBe(true);
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return Math.max(root.scrollWidth - root.clientWidth, body.scrollWidth - root.clientWidth);
  });
  expect(Math.ceil(overflow)).toBeLessThanOrEqual(2);
}

async function expectTutorialDialogCentered(page: Page) {
  const dialogBox = await page.locator("[data-tutorial-dialog]").boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!dialogBox || !viewport) {
    throw new Error("tutorial dialog was not measurable");
  }

  expect(dialogBox.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(Math.abs(dialogBox.x + dialogBox.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(2);
}

async function dismissTutorialIfPresent(page: Page) {
  const tutorialHeading = page.getByRole("heading", { name: "ResearchGit workflow" });
  try {
    await expect(tutorialHeading).toBeVisible({ timeout: 3_000 });
  } catch {
    return;
  }
  await page.getByRole("button", { name: "Skip tutorial" }).click();
  await expect(tutorialHeading).toHaveCount(0);
}

async function createUniqueDraft(page: Page, authorName = "Yun Huang") {
  const uniqueCardId = `e2e-workflow-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const response = await page.request.post("/api/ideas/store", {
    data: {
      action: "createIdeaFromCard",
      payload: {
        authorName,
        card: {
          id: uniqueCardId,
          title: `E2E workflow draft ${uniqueCardId}`,
          hypothesis:
            "If a unique E2E paper workflow is inspectable, researchers can validate drafting without creating duplicate dashboard cards.",
          methodSketch:
            "Source paper: Body Transformation Experiences: A workshop on How to Elicit, Assess and Support them through Multisensory Technology\nSession: P1 - Room 111\nPrototype a focused workflow for repeatable browser testing.",
          novelty: [
            "Keeps the end-to-end draft path unique across repeated Playwright runs.",
            "Exercises the same canvas publishing flow without depending on stale duplicated cards.",
            "Grounds the workflow in a real CHI paper record.",
          ],
          groundingPaperIds: ["p1-room-111-66"],
        },
      },
    },
  });
  expect(response.ok()).toBe(true);
  const result = (await response.json()) as { idea: { id: string } | null };
  if (!result.idea) throw new Error("unique draft was not created");
  createdIdeaOwners.set(result.idea.id, authorName);
  await page.goto(`/ideas/${result.idea.id}/draft?author=${encodeURIComponent(authorName)}`);
  return result.idea.id;
}

async function createUniqueOpenIdea(page: Page, authorName = "Yun Huang") {
  const ideaId = await createUniqueDraft(page, authorName);
  const params = new URLSearchParams({ author: authorName });
  const storeResponse = await page.request.get(`/api/ideas/store?${params.toString()}`);
  expect(storeResponse.ok()).toBe(true);
  const storeState = (await storeResponse.json()) as {
    ideas: Array<{
      id: string;
      title: string;
      hypothesis: string;
      methodology: string;
      novelty: string[];
      citations: string[];
      notes: Array<Record<string, unknown>>;
    }>;
  };
  const idea = storeState.ideas.find((candidate) => candidate.id === ideaId);
  if (!idea) throw new Error("unique idea was not found before publishing");
  const publishResponse = await page.request.post("/api/ideas/store", {
    data: {
      action: "publishIdea",
      payload: {
        ideaId,
        actorName: authorName,
        fields: {
          title: idea.title,
          hypothesis: idea.hypothesis,
          methodology: idea.methodology,
          novelty: idea.novelty,
          citations: idea.citations,
        },
        notes: idea.notes,
      },
    },
  });
  expect(publishResponse.ok()).toBe(true);
  return ideaId;
}

test.describe("v2 author workflow", () => {
  test.beforeEach(async ({ request }) => {
    await cleanupE2EWorkflowIdeas(request);
  });

  test.afterEach(async ({ request }) => {
    const cleanupEntries = [...createdIdeaOwners.entries()];
    createdIdeaOwners.clear();

    for (const [ideaId, actorName] of cleanupEntries) {
      const response = await request.post("/api/ideas/store", {
        data: {
          action: "deleteIdea",
          payload: { ideaId, actorName },
        },
      });
      expect(response.ok()).toBe(true);
    }
    await cleanupE2EWorkflowIdeas(request);
  });

  test("author lookup shows selectable matches while typing", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Enter your CHI 2026 name").fill("Yun H");

    const yunSuggestion = page.locator("[data-author-suggestion]").filter({ hasText: "Yun Huang" });
    await expect(yunSuggestion).toBeVisible();

    await yunSuggestion.click();
    await expect(page.getByRole("heading", { name: "Yun Huang" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Yes, continue" })).toBeVisible();
  });

  test("author lookup does not prefill the name field", async ({ page }) => {
    await page.goto("/login?name=Yun%20Huang");
    await expect(page.getByPlaceholder("Enter your CHI 2026 name")).toHaveValue("");
    await expect(page.getByText(/pre-filled from your authenticated profile/i)).toHaveCount(0);
  });

  test("home page is the Google sign-in landing page", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /sign in as a chi 2026 author/i }),
    ).toBeVisible();
    await expect(page.getByText("Continue with Google")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your CHI 2026 name")).toHaveCount(0);
  });

  test("author lookup blocks unknown CHI authors", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Enter your CHI 2026 name").fill("Not A Real CHI Author");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/no chi 2026 author paper is linked/i)).toBeVisible();
  });

  test("idea store API rejects unmatched authors and invalid enums", async ({ request }) => {
    const storeResponse = await request.get("/api/ideas/store");
    expect(storeResponse.ok()).toBe(true);
    const storeState = (await storeResponse.json()) as {
      ideas: Array<{ id: string; status: string }>;
    };
    const openIdea = storeState.ideas.find((idea) => idea.status === "open");
    if (!openIdea) throw new Error("open idea seed was not found");

    const createResponse = await request.post("/api/ideas/store", {
      data: {
        action: "createIdeaFromCard",
        payload: {
          authorName: "Not A CHI Author",
          card: {
            id: "api-rejected-card",
            title: "API rejected card",
            hypothesis: "This should not be created.",
            methodSketch: "Invalid author method.",
            novelty: ["Invalid author"],
            groundingPaperIds: ["p1-room-122-61"],
          },
        },
      },
    });
    expect(createResponse.status()).toBe(401);

    const topicResponse = await request.post("/api/ideas/store", {
      data: {
        action: "createTopicIdeaFromCard",
        payload: {
          actorName: "Yun Huang",
          card: {
            id: "topic-not-a-real-topic",
            title: "Invalid topic",
            hypothesis: "This should not become a topic.",
            methodSketch: "Invalid topic method.",
            novelty: ["Invalid topic"],
            groundingPaperIds: [],
          },
        },
      },
    });
    expect(topicResponse.ok()).toBe(true);
    expect(((await topicResponse.json()) as { idea: unknown }).idea).toBeNull();

    const voteResponse = await request.post("/api/ideas/store", {
      data: {
        action: "toggleIdeaUpvote",
        payload: { ideaId: openIdea.id, authorName: "Not A CHI Author" },
      },
    });
    expect(voteResponse.status()).toBe(401);

    const commentResponse = await request.post("/api/ideas/store", {
      data: {
        action: "addCommentToIdea",
        payload: {
          ideaId: openIdea.id,
          authorName: "Yiren Liu",
          type: "invalid_type",
          body: "Malformed comment",
        },
      },
    });
    expect(commentResponse.ok()).toBe(true);
    expect(((await commentResponse.json()) as { idea: unknown }).idea).toBeNull();
  });

  test("dashboard setup tutorial covers the major workflow", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/dashboard?author=Yun%20Huang&onboard=1");
    await expect(page.getByRole("heading", { name: "ResearchGit workflow" })).toBeVisible();
    await expectTutorialDialogCentered(page);

    const tutorialSteps = [
      "Match your CHI identity",
      "Scan your CHI papers",
      "Generate from selected papers",
      "Explore broader sessions",
      "Join a shared topic canvas",
      "Build with sticky notes",
      "Comment and synthesize",
    ];

    for (const [index, tutorialStep] of tutorialSteps.entries()) {
      await expect(
        page.getByText(`Step ${index + 1} of ${tutorialSteps.length}`, { exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: tutorialStep, exact: true })).toBeVisible();
      await expect(page.getByText("Where", { exact: true })).toBeVisible();
      await expect(page.getByText("Use when", { exact: true })).toBeVisible();
      await expect(page.getByText("Do this", { exact: true })).toBeVisible();
      await expect(page.getByText("Next", { exact: true })).toBeVisible();

      if (index < tutorialSteps.length - 1) {
        await page.getByRole("button", { name: "Next step" }).click();
      }
    }

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("heading", { name: "ResearchGit workflow" })).toHaveCount(0);
    await expect(page).not.toHaveURL(/onboard=/);
  });

  test("dashboard setup tutorial stays centered on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard?author=Yun%20Huang&onboard=1");
    await expect(page.getByRole("heading", { name: "ResearchGit workflow" })).toBeVisible();
    await expectTutorialDialogCentered(page);
    await expectNoHorizontalOverflow(page);
  });

  test("dashboard setup tutorial opens once per login token", async ({ page }) => {
    const onboardingToken = `login-token-${Date.now()}`;
    await page.goto(`/dashboard?author=Yun%20Huang&onboard=${onboardingToken}`);
    await expect(page.getByRole("heading", { name: "ResearchGit workflow" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "ResearchGit workflow" })).toHaveCount(0);
  });

  test("dashboard setup tutorial opens when ideas fail to load", async ({ page }) => {
    await page.route("**/api/ideas/store", (route) => route.abort());
    await page.goto("/dashboard?author=Yun%20Huang&onboard=1");
    await expect(page.getByRole("heading", { name: "ResearchGit workflow" })).toBeVisible();
    await expect(page.getByText("Step 1 of 7", { exact: true })).toBeVisible();
  });

  test("dashboard topics use session cards and keyword generation", async ({ page }) => {
    await page.goto("/dashboard?author=Ziyi%20Zhang");
    await dismissTutorialIfPresent(page);
    await expect(page.getByRole("heading", { name: "Broader topics" })).toBeVisible();

    const topicSection = page.locator("[data-topic-section]");
    const topicCards = topicSection.locator("[data-topic-card]");
    await expect.poll(async () => topicCards.count()).toBe(1);
    await expect(topicCards.first()).toContainText("Session: P1 - Room 122");
    await expect(topicCards.first()).toContainText("AI in Practice");
    await expect(page.getByLabel("Keywords for similar topics")).toHaveCount(0);
    const topicSectionBox = await topicSection.boundingBox();
    const initialGenerateBox = await page
      .getByRole("button", { name: "Generate more topics" })
      .boundingBox();
    expect(topicSectionBox).not.toBeNull();
    expect(initialGenerateBox).not.toBeNull();
    if (!topicSectionBox || !initialGenerateBox) {
      throw new Error("topic section or generate button was not measurable");
    }
    expect(initialGenerateBox.x).toBeGreaterThan(topicSectionBox.x + topicSectionBox.width / 2);
    await page.getByRole("button", { name: "Generate more topics" }).click();
    await expect(page.getByLabel("Keywords for similar topics")).toBeVisible();
    await page.getByLabel("Keywords for similar topics").fill("latency timing agents");
    await page.getByRole("button", { name: "Generate more topics" }).click();
    await expect(page.locator("[data-generated-topic-review]")).toBeVisible();
    await expect(page.getByText(/Generated \d+ session topic/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm and join" })).toBeDisabled();
    await page.getByLabel("Cancel generated topics").click({ position: { x: 5, y: 5 } });
    await expect(page.locator("[data-generated-topic-review]")).toHaveCount(0);
    await expect.poll(async () => topicCards.count()).toBe(1);
    await page.getByRole("button", { name: "Generate more topics" }).click();
    await expect(page.locator("[data-generated-topic-review]")).toBeVisible();
    await page.locator("[data-generated-topic-option]").first().getByRole("button").click();
    await expect(page.locator("[data-selected-generated-topics]")).toBeVisible();
    await page.getByRole("button", { name: "Confirm and join" }).click();
    await expect(page.locator("[data-generated-topic-review]")).toHaveCount(0);
    await expect.poll(async () => topicCards.count()).toBe(2);
    await expectNoHorizontalOverflow(page);
  });

  test("dashboard actions stay colocated at tablet widths", async ({ page }) => {
    await page.setViewportSize({ width: 866, height: 717 });
    await page.goto("/dashboard?author=Ziyi%20Zhang");
    await dismissTutorialIfPresent(page);
    await expect(page.locator("[data-idea-actions]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "My idea workspace" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Generate draft" })).toBeDisabled();
    const topicSection = page.locator("[data-topic-section]");
    await expect(topicSection.getByRole("button", { name: "Generate more topics" })).toBeVisible();
    await expect(topicSection.getByRole("link", { name: "Marketplace" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const topicSectionBox = await topicSection.boundingBox();
    const actionBoxes = await topicSection.locator("a, button").evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      }),
    );
    expect(topicSectionBox).not.toBeNull();
    if (!topicSectionBox) throw new Error("topic section was not measurable");
    for (const box of actionBoxes) {
      expect(box.left).toBeGreaterThanOrEqual(topicSectionBox.x - 1);
      expect(box.right).toBeLessThanOrEqual(topicSectionBox.x + topicSectionBox.width + 1);
    }
  });

  test("broader topic cards expose one canvas entry point", async ({ page }) => {
    await page.goto("/dashboard?author=Yun%20Huang");
    await dismissTutorialIfPresent(page);
    await expect(page.getByRole("heading", { name: "Broader topics" })).toBeVisible();
    const firstTopic = page.locator("[data-topic-card]").first();
    await expect(firstTopic).toBeVisible();
    const topicTitle = await firstTopic.locator("h3").innerText();
    const dashboardUrl = page.url();

    await firstTopic.getByRole("button", { name: "Join topic" }).click();

    await expect(page).toHaveURL(dashboardUrl);
    await expect(firstTopic.getByRole("button", { name: "Join topic" })).toHaveCount(0);
    await expect(firstTopic.locator("[data-inline-topic-workspace]")).toHaveCount(0);
    await expect(firstTopic.getByText("Session paper browser")).toHaveCount(0);
    await expect(firstTopic.getByRole("link", { name: "Open canvas" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(firstTopic.getByText("Open", { exact: true })).toBeVisible();
    await expect(firstTopic.getByText("Joined", { exact: true })).toBeVisible();
    await expect(firstTopic.getByText(/\d+ note\(s\)/)).toBeVisible();
    await expect(firstTopic.getByText(/\d+ comment\(s\)/)).toBeVisible();
    await firstTopic.getByRole("link", { name: "Open canvas" }).click();
    await expect(page).toHaveURL(/\/topics\/[^/]+\?author=/);
    await expect(page.getByRole("heading", { name: topicTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sticky note area" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Same-topic CHI 2026 papers" })).toBeVisible();
    const firstPaperRow = page.locator("[data-topic-paper-row]").first();
    const firstPaperTitle = await firstPaperRow.locator("h3").innerText();
    await firstPaperRow.getByRole("link", { name: "Open paper" }).click();
    await expect(page).toHaveURL(/\/topics\/[^/]+\/papers\//);
    await expect(
      page.locator("header").first().getByRole("heading", { level: 1, name: firstPaperTitle }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sticky note area" })).toBeVisible();
    const topicHeader = page.locator("header").first();
    const topicHeaderActions = page.locator("[data-topic-header-actions]");
    const topicHeaderBox = await topicHeader.boundingBox();
    const topicHeaderActionsBox = await topicHeaderActions.boundingBox();
    expect(topicHeaderBox).not.toBeNull();
    expect(topicHeaderActionsBox).not.toBeNull();
    if (!topicHeaderBox || !topicHeaderActionsBox) {
      throw new Error("topic header or header actions were not measurable");
    }
    expect(topicHeaderActionsBox.x).toBeGreaterThan(topicHeaderBox.x + topicHeaderBox.width / 2);
    await expect(
      page.locator("[data-board-sidebar]").getByRole("button", {
        name: "Generate analysis report",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Program record" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open paper" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Comment composer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Comment threads" })).toBeVisible();
  });

  for (const authorName of ["Yun Huang", "Yiren Liu", "Hyanghee Park"]) {
    test(`matched author reaches own dashboard: ${authorName}`, async ({ page }) => {
      await page.goto("/login");
      await page.getByPlaceholder("Enter your CHI 2026 name").fill(authorName);
      await page.locator("[data-author-suggestion]").filter({ hasText: authorName }).click();
      await page.getByRole("button", { name: "Yes, continue" }).click();
      await expect(page.getByRole("heading", { name: authorName })).toBeVisible();
      await expect(page.getByRole("heading", { name: "My Publications" })).toBeVisible();
    });
  }

  test("private drafts reject a mismatched author query", async ({ page }) => {
    await createUniqueDraft(page);
    await expect(page.getByText("Draft canvas", { exact: true })).toBeVisible({ timeout: 15_000 });

    const draftUrl = new URL(page.url());
    draftUrl.searchParams.set("author", "Yiren Liu");
    await page.goto(`${draftUrl.pathname}${draftUrl.search}`);
    await expect(page.getByRole("heading", { name: "Draft not found" })).toBeVisible();
    await expect(page.locator("[data-board-viewport]")).toHaveCount(0);
  });

  test("marketplace opens real author ideas into the shared canvas", async ({ page }) => {
    await createUniqueOpenIdea(page);
    await page.goto("/marketplace?author=Yun%20Huang");
    await expect(page.getByRole("heading", { name: "Shared idea board" })).toBeVisible();
    const marketplaceCards = page.locator("[data-marketplace-sticky]");
    await expect.poll(async () => marketplaceCards.count()).toBeGreaterThanOrEqual(3);
    const firstCardBox = await marketplaceCards.nth(0).boundingBox();
    const secondCardBox = await marketplaceCards.nth(1).boundingBox();
    const firstFooterBox = await marketplaceCards
      .nth(0)
      .locator("[data-marketplace-card-footer]")
      .boundingBox();
    expect(firstCardBox).not.toBeNull();
    expect(secondCardBox).not.toBeNull();
    expect(firstFooterBox).not.toBeNull();
    if (!firstCardBox || !secondCardBox || !firstFooterBox) {
      throw new Error("marketplace card layout was not measurable");
    }
    const cardsOverlap =
      firstCardBox.x < secondCardBox.x + secondCardBox.width &&
      firstCardBox.x + firstCardBox.width > secondCardBox.x &&
      firstCardBox.y < secondCardBox.y + secondCardBox.height &&
      firstCardBox.y + firstCardBox.height > secondCardBox.y;
    expect(cardsOverlap).toBe(false);
    expect(firstFooterBox.y + firstFooterBox.height).toBeLessThanOrEqual(
      firstCardBox.y + firstCardBox.height + 1,
    );

    for (const authorName of ["Yun Huang", "Yiren Liu", "Hyanghee Park"]) {
      await expect(marketplaceCards.filter({ hasText: authorName }).first()).toBeVisible();
    }

    const marketplaceUrl = page.url();
    await marketplaceCards.first().getByRole("button", { name: /up$/ }).click();
    await expect(page).toHaveURL(marketplaceUrl);

    await marketplaceCards.filter({ hasText: "Yiren Liu" }).first().click();
    await expect(page.getByRole("heading", { name: "Shared collaboration board" })).toBeVisible();
    await expect(page.locator("[data-board-viewport]")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Comment composer" })).toBeVisible();
    await expect(page.locator("[data-readonly-board-notice]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add sticky note" })).toHaveCount(0);
  });

  test("AI suggested themes keep default sticky content readable", async ({ page }) => {
    await createUniqueDraft(page);
    await expect(page.getByText("Draft canvas", { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "AI suggested themes" }).click();
    await expect
      .poll(async () => page.locator("[data-theme-group-label]").count())
      .toBeGreaterThanOrEqual(3);

    await expect
      .poll(async () =>
        page
          .locator("[data-sticky-note-body]")
          .evaluateAll((bodies) =>
            bodies.every((body) => body.scrollHeight <= body.clientHeight + 1),
          ),
      )
      .toBe(true);
  });

  test("draft AI enhancement saves and restores version history", async ({ page }) => {
    test.setTimeout(45_000);
    await createUniqueDraft(page);
    await expect(page.getByText("Draft canvas", { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Enhance with AI" }).click();
    await expect(page.getByRole("heading", { name: "Enhance draft with AI" })).toBeVisible();
    await page.getByRole("button", { name: "Strengthen method" }).click();
    await page.getByRole("button", { name: "Generate suggestion" }).click();
    await expect(page.getByRole("heading", { name: "Proposed AI version" })).toBeVisible();
    await page.getByRole("button", { name: "Accept enhancement" }).click();
    await expect(page.getByText("AI enhancement: Strengthen method").first()).toBeVisible();

    await page.getByRole("button", { name: /Versions/ }).click();
    await expect(page.getByRole("heading", { name: "Version history" })).toBeVisible();
    await expect(page.getByText("AI enhancement: Strengthen method").first()).toBeVisible();
    await page.getByRole("button", { name: "Restore version" }).first().click();
    await expect(page.getByRole("heading", { name: "Version history" })).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(page.getByText("AI enhancement: Strengthen method").first()).toBeVisible();
  });

  test("sticky notes can be enhanced with configurable AI", async ({ page }) => {
    await page.route("**/api/canvas/enhance-sticky", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          text: "Evidence to add: connect this sticky note to a concrete CHI paper signal.",
        }),
      });
    });

    await createUniqueDraft(page);
    await expect(page.getByText("Draft canvas", { exact: true })).toBeVisible({ timeout: 15_000 });

    const firstSticky = page.locator("[data-sticky-note]").first();
    await firstSticky.click();
    await page.getByRole("button", { name: "Enhance sticky with AI" }).click();
    await expect(page.getByRole("heading", { name: "Enhance sticky note" })).toBeVisible();
    await page.getByRole("button", { name: "Evidence" }).click();
    await expect(page.getByText("Evidence to add:")).toBeVisible();
    await page.getByRole("button", { name: "Apply to sticky" }).click();
    await expect(firstSticky.locator("[data-sticky-note-body]")).toContainText("Evidence to add");
  });

  test("draft canvas updates when another collaborator changes notes", async ({ page }) => {
    test.setTimeout(45_000);
    const ideaId = await createUniqueDraft(page);
    await expect(page.getByText("Draft canvas", { exact: true })).toBeVisible({ timeout: 15_000 });

    const remoteText = `REMOTE LIVE UPDATE ${Date.now()}`;
    const params = new URLSearchParams({ author: "Yun Huang" });
    const storeResponse = await page.request.get(`/api/ideas/store?${params.toString()}`);
    expect(storeResponse.ok()).toBe(true);
    const storeState = (await storeResponse.json()) as {
      ideas: Array<{ id: string; notes: Array<Record<string, unknown>> }>;
    };
    const idea = storeState.ideas.find((candidate) => candidate.id === ideaId);
    if (!idea) throw new Error("draft idea was not found in store");
    const notes = idea.notes.map((note, index) =>
      index === 0 ? { ...note, text: remoteText } : note,
    );

    const saveResponse = await page.request.post("/api/ideas/store", {
      data: {
        action: "saveIdeaNotes",
        payload: {
          ideaId,
          notes,
          actorName: "Yun Huang",
        },
      },
    });
    expect(saveResponse.ok()).toBe(true);

    await expect(page.locator("[data-sticky-note-body]").first()).toContainText(remoteText, {
      timeout: 15_000,
    });
  });

  test("sidebar search selection recenters the matching sticky", async ({ page }) => {
    await createUniqueDraft(page);
    await expect(page.getByText("Draft canvas", { exact: true })).toBeVisible({ timeout: 15_000 });

    const boardCanvas = page.locator("[data-board-canvas]");
    const boardViewport = page.locator("[data-board-viewport]");
    await page.getByPlaceholder("Search notes").fill("Novelty 2");
    const searchResult = page.locator("[data-sidebar-note]").filter({ hasText: "Novelty 2" });
    await expect(searchResult.first()).toBeVisible();

    const beforeTransform = await boardCanvas.evaluate(
      (element) => getComputedStyle(element).transform,
    );
    await searchResult.first().click();
    await expect
      .poll(async () => boardCanvas.evaluate((element) => getComputedStyle(element).transform))
      .not.toBe(beforeTransform);

    const stickyBox = await page
      .locator("[data-sticky-note]")
      .filter({ hasText: "Novelty 2" })
      .first()
      .boundingBox();
    const viewportBox = await boardViewport.boundingBox();
    expect(stickyBox).not.toBeNull();
    expect(viewportBox).not.toBeNull();
    if (!stickyBox || !viewportBox) {
      throw new Error("sticky note or board viewport was not measurable");
    }
    const stickyCenterX = stickyBox.x + stickyBox.width / 2;
    const stickyCenterY = stickyBox.y + stickyBox.height / 2;
    expect(stickyCenterX).toBeGreaterThanOrEqual(viewportBox.x);
    expect(stickyCenterX).toBeLessThanOrEqual(viewportBox.x + viewportBox.width);
    expect(stickyCenterY).toBeGreaterThanOrEqual(viewportBox.y);
    expect(stickyCenterY).toBeLessThanOrEqual(viewportBox.y + viewportBox.height);
  });

  test("core v2 pages stay responsive on mobile", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of [
      "/",
      "/login",
      "/dashboard?author=Yun%20Huang&onboard=1",
      "/ideas/new?author=Yun%20Huang&mode=all",
      "/marketplace?author=Yun%20Huang",
    ]) {
      await page.goto(route);
      await expectNoHorizontalOverflow(page);
    }

    await createUniqueDraft(page);
    await expect(page.getByText("Draft canvas", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expectNoHorizontalOverflow(page);

    const draftViewportBox = await page.locator("[data-board-viewport]").boundingBox();
    expect(draftViewportBox).not.toBeNull();
    if (!draftViewportBox) {
      throw new Error("draft board viewport was not measurable");
    }
    expect(draftViewportBox.width).toBeGreaterThan(250);

    await page.getByRole("button", { name: "Publish to marketplace" }).click();
    await expect(page.getByRole("heading", { name: "Review synthesis" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Comment composer" })).toBeVisible({
      timeout: 30_000,
    });
    await expectNoHorizontalOverflow(page);

    const detailViewportBox = await page.locator("[data-board-viewport]").boundingBox();
    expect(detailViewportBox).not.toBeNull();
    if (!detailViewportBox) {
      throw new Error("detail board viewport was not measurable");
    }
    expect(detailViewportBox.width).toBeGreaterThan(250);

    await expect(page.getByRole("button", { name: "Lock idea" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("core v2 pages pass an axe accessibility smoke check", async ({ page }) => {
    for (const route of ["/", "/login", "/dashboard?author=Ziyi%20Zhang"]) {
      await page.goto(route);
      await dismissTutorialIfPresent(page);
      const results = await new AxeBuilder({ page }).include("main").analyze();
      expect(results.violations).toEqual([]);
    }
  });

  test("detail comments are shared across browser contexts", async ({ browser }) => {
    test.setTimeout(45_000);
    const yunContext = await browser.newContext();
    const yirenContext = await browser.newContext();
    const yunPage = await yunContext.newPage();
    const yirenPage = await yirenContext.newPage();
    const sharedNote = `Cross-context detail comment ${Date.now()}`;

    await createUniqueOpenIdea(yunPage);
    await yunPage.goto("/marketplace?author=Yun%20Huang");
    await expect(yunPage.getByRole("heading", { name: "Shared idea board" })).toBeVisible();
    await yunPage
      .locator("[data-marketplace-sticky]")
      .filter({ hasText: "E2E workflow draft" })
      .first()
      .click();
    await expect(yunPage.getByRole("heading", { name: "Comment composer" })).toBeVisible();
    await yunPage.locator("select").selectOption("experiment_idea");
    await yunPage.locator("textarea").first().fill(sharedNote);
    await yunPage.getByRole("button", { name: "Post comment" }).click();
    await expect(yunPage.getByText(sharedNote)).toBeVisible({ timeout: 15_000 });

    const detailUrl = new URL(yunPage.url());
    detailUrl.searchParams.set("author", "Yiren Liu");
    await yirenPage.goto(`${detailUrl.pathname}${detailUrl.search}`);
    await expect(yirenPage.getByRole("heading", { name: "Comment composer" })).toBeVisible();
    await expect(yirenPage.getByText(sharedNote)).toBeVisible({ timeout: 15_000 });

    await yunContext.close();
    await yirenContext.close();
  });

  test("matched author can draft, publish, and comment", async ({ page }) => {
    test.setTimeout(75_000);
    const customNote = "CUSTOM EDGE CASE NOTE FOR PUBLISH E2E";
    const longCustomNote = Array.from(
      { length: 14 },
      (_, index) => `${customNote} ${index + 1}`,
    ).join("\n");
    const customComment = "Custom E2E method critique";

    await page.goto("/login");
    await page.getByPlaceholder("Enter your CHI 2026 name").fill("Yun Huang");
    await page.locator("[data-author-suggestion]").filter({ hasText: "Yun Huang" }).click();
    await page.getByRole("button", { name: "Yes, continue" }).click();
    await expect(page.getByRole("heading", { name: "My Publications" })).toBeVisible();

    await dismissTutorialIfPresent(page);
    const authorHeading = page.getByRole("heading", { name: "Yun Huang" });
    const publicationsHeading = page.getByRole("heading", { name: "My Publications" });
    const topicsHeading = page.getByRole("heading", { name: "Broader topics" });
    const authorBox = await authorHeading.boundingBox();
    const publicationsBox = await publicationsHeading.boundingBox();
    const topicsBox = await topicsHeading.boundingBox();
    expect(authorBox).not.toBeNull();
    expect(publicationsBox).not.toBeNull();
    expect(topicsBox).not.toBeNull();
    if (!authorBox || !publicationsBox || !topicsBox) {
      throw new Error("dashboard section ordering was not measurable");
    }
    expect(authorBox.y + authorBox.height).toBeLessThan(publicationsBox.y);
    expect(publicationsBox.y).toBeLessThan(topicsBox.y);

    await expect(page.getByRole("heading", { name: "Broader topics" })).toBeVisible();
    await dismissTutorialIfPresent(page);
    const firstTopic = page.locator("[data-topic-card]").first();
    await expect(firstTopic).toBeVisible();
    await expect(firstTopic.getByRole("button", { name: "Join topic" })).toBeVisible();
    await createUniqueDraft(page);
    await expect(page.getByText("Draft canvas", { exact: true })).toBeVisible({ timeout: 15_000 });

    const draftHeader = page.locator("[data-draft-header]");
    const boardViewport = page.locator("[data-board-viewport]");
    const boardCanvas = page.locator("[data-board-canvas]");
    const headerBox = await draftHeader.boundingBox();
    const boardBox = await boardViewport.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(boardBox).not.toBeNull();
    if (!headerBox || !boardBox)
      throw new Error("draft header or board viewport was not measurable");
    expect(headerBox.y + headerBox.height).toBeLessThanOrEqual(boardBox.y + 1);
    const beforePanTransform = await boardCanvas.evaluate(
      (element) => getComputedStyle(element).transform,
    );
    const viewportBox = await boardViewport.boundingBox();
    expect(viewportBox).not.toBeNull();
    if (!viewportBox) throw new Error("board viewport was not measurable");
    await page.mouse.move(viewportBox.x + 20, viewportBox.y + 20);
    await page.mouse.down();
    await page.mouse.move(viewportBox.x + 120, viewportBox.y + 90);
    await page.mouse.up();
    await expect
      .poll(async () => boardCanvas.evaluate((element) => getComputedStyle(element).transform))
      .not.toBe(beforePanTransform);

    const beforeWheelTransform = await boardCanvas.evaluate(
      (element) => getComputedStyle(element).transform,
    );
    await page.mouse.wheel(80, 60);
    await expect
      .poll(async () => boardCanvas.evaluate((element) => getComputedStyle(element).transform))
      .not.toBe(beforeWheelTransform);

    const stickyNotes = page.locator("[data-sticky-note]");
    await expect.poll(async () => stickyNotes.count()).toBeGreaterThan(0);
    const sidebarNotes = page.locator("[data-sidebar-note]");
    await expect.poll(async () => sidebarNotes.count()).toBeLessThanOrEqual(3);
    await page.getByPlaceholder("Search notes").fill("Novelty 2");
    await expect(sidebarNotes.first()).toContainText("Novelty 2");
    await expect.poll(async () => sidebarNotes.count()).toBeLessThanOrEqual(3);
    await page.getByPlaceholder("Search notes").fill("");
    const firstSticky = stickyNotes.first();
    await firstSticky.dblclick();
    await expect(firstSticky.locator("textarea")).toBeVisible();
    await firstSticky.locator("textarea").fill(longCustomNote);
    await page.keyboard.press("Escape");

    const stickyBody = firstSticky.locator("[data-sticky-note-body]");
    await expect(stickyBody).toContainText(customNote);
    await expect
      .poll(async () =>
        stickyBody.evaluate((element) => element.scrollHeight > element.clientHeight),
      )
      .toBe(true);

    const beforeResize = await firstSticky.boundingBox();
    await expect(firstSticky.locator("[data-sticky-resize-handle]")).toHaveCount(4);
    const resizeHandle = firstSticky.locator("[data-resize-corner=se]");
    const resizeBox = await resizeHandle.boundingBox();
    expect(beforeResize).not.toBeNull();
    expect(resizeBox).not.toBeNull();
    if (!beforeResize || !resizeBox)
      throw new Error("sticky note or resize handle was not measurable");
    await page.mouse.move(resizeBox.x + resizeBox.width / 2, resizeBox.y + resizeBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      resizeBox.x + resizeBox.width / 2 - 90,
      resizeBox.y + resizeBox.height / 2 - 70,
    );
    await page.mouse.up();
    const afterResize = await firstSticky.boundingBox();
    expect(afterResize).not.toBeNull();
    if (!afterResize) throw new Error("sticky note was not measurable after resizing");
    expect(afterResize.width).toBeLessThan(beforeResize.width - 20);
    expect(afterResize.height).toBeLessThan(beforeResize.height - 20);

    const northwestResizeHandle = firstSticky.locator("[data-resize-corner=nw]");
    const northwestResizeBox = await northwestResizeHandle.boundingBox();
    expect(northwestResizeBox).not.toBeNull();
    if (!northwestResizeBox) throw new Error("northwest resize handle was not measurable");
    await page.mouse.move(
      northwestResizeBox.x + northwestResizeBox.width / 2,
      northwestResizeBox.y + northwestResizeBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      northwestResizeBox.x + northwestResizeBox.width / 2 - 70,
      northwestResizeBox.y + northwestResizeBox.height / 2 - 50,
    );
    await page.mouse.up();
    const afterNorthwestResize = await firstSticky.boundingBox();
    expect(afterNorthwestResize).not.toBeNull();
    if (!afterNorthwestResize) {
      throw new Error("sticky note was not measurable after northwest resizing");
    }
    expect(afterNorthwestResize.width).toBeGreaterThan(afterResize.width + 20);
    expect(afterNorthwestResize.height).toBeGreaterThan(afterResize.height + 20);

    await page.getByRole("button", { name: "AI suggested themes" }).click();
    await expect
      .poll(async () => page.locator("[data-theme-group-label]").count())
      .toBeGreaterThanOrEqual(3);
    await expect(page.getByText("Study method and evaluation plan").first()).toBeVisible();
    await expect(page.getByText("Novelty and CHI contribution positioning").first()).toBeVisible();
    await expect(page.getByText("Ungrouped notes").first()).toBeVisible();

    await page.getByRole("button", { name: "Publish to marketplace" }).click();
    await expect(page.getByRole("heading", { name: "Review synthesis" })).toBeVisible();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Comment composer" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(customNote).first()).toBeVisible();
    await expect(page.getByText("Owner controls")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit fields" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Iterate with AI" })).toHaveCount(0);

    await page.getByRole("link", { name: "Marketplace" }).click();
    await expect(page.getByRole("heading", { name: "Shared idea board" })).toBeVisible();
    const marketplaceCard = page
      .locator("[data-marketplace-sticky]")
      .filter({ hasText: "E2E workflow draft" })
      .first();
    await expect(marketplaceCard).toBeVisible();
    const marketplaceDescriptionBox = await marketplaceCard
      .locator("[data-marketplace-card-description]")
      .boundingBox();
    const marketplaceFooterBox = await marketplaceCard
      .locator("[data-marketplace-card-footer]")
      .boundingBox();
    expect(marketplaceDescriptionBox).not.toBeNull();
    expect(marketplaceFooterBox).not.toBeNull();
    if (!marketplaceDescriptionBox || !marketplaceFooterBox) {
      throw new Error("marketplace card layout was not measurable");
    }
    expect(marketplaceDescriptionBox.y + marketplaceDescriptionBox.height).toBeLessThanOrEqual(
      marketplaceFooterBox.y + 1,
    );
    await marketplaceCard.click();
    await expect(page.getByRole("heading", { name: "Shared collaboration board" })).toBeVisible();
    await expect(page.locator("[data-board-viewport]")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Comment composer" })).toBeVisible();

    await page.locator("select").selectOption("method_critique");
    await page.locator("textarea").fill(customComment);
    await page.getByRole("button", { name: "Post comment" }).click();
    await expect(page.getByText(customComment)).toBeVisible();
    await expect(page.getByText("Mark helpful")).toHaveCount(0);
    await expect(page.locator("input[type=checkbox]")).toHaveCount(0);

    await expect(page.getByRole("button", { name: "Lock idea" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Comment composer" })).toBeVisible();
  });
});
