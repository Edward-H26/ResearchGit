import { type APIRequestContext, type Page, expect, test } from "@playwright/test";

const createdIdeaOwners = new Map<string, string>();

async function cleanupE2EWorkflowIdeas(request: APIRequestContext) {
  const response = await request.get("/api/ideas/store");
  expect(response.ok()).toBe(true);
  const state = (await response.json()) as {
    ideas: Array<{ id: string; ownerName: string; title: string; cardId: string }>;
  };
  const e2eIdeas = state.ideas.filter(
    (idea) =>
      idea.title.startsWith("E2E workflow draft") || idea.cardId.startsWith("e2e-workflow-"),
  );

  for (const idea of e2eIdeas) {
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
  const storeResponse = await page.request.get("/api/ideas/store");
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

  test("dashboard setup tutorial covers the major workflow", async ({ page }) => {
    await page.goto("/dashboard?author=Yun%20Huang&onboard=1");
    await expect(page.getByRole("heading", { name: "ResearchGit workflow" })).toBeVisible();
    await expectTutorialDialogCentered(page);

    const tutorialSteps = [
      "Account and author match",
      "Publications",
      "Recommendations",
      "Idea generation",
      "Draft canvas",
      "Marketplace feedback",
    ];

    for (const [index, tutorialStep] of tutorialSteps.entries()) {
      await expect(
        page.getByText(`Step ${index + 1} of ${tutorialSteps.length}`, { exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: tutorialStep, exact: true })).toBeVisible();

      if (index < tutorialSteps.length - 1) {
        await page.getByRole("button", { name: "Next feature" }).click();
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
    await expect(page.getByText("Step 1 of 6", { exact: true })).toBeVisible();
  });

  test("dashboard topics use an explicit generate more control", async ({ page }) => {
    const authorKey = "yun-huang";
    const storeResponse = await page.request.get("/api/ideas/store");
    expect(storeResponse.ok()).toBe(true);
    const storeState = (await storeResponse.json()) as {
      topicRecommendationCountByAuthor?: Record<string, number>;
    };
    const previousTopicCount = storeState.topicRecommendationCountByAuthor?.[authorKey];

    try {
      const resetResponse = await page.request.post("/api/ideas/store", {
        data: {
          action: "saveTopicRecommendationCount",
          payload: {
            normalizedAuthorName: authorKey,
            visibleTopicCount: 3,
          },
        },
      });
      expect(resetResponse.ok()).toBe(true);

      await page.goto("/dashboard?author=Yun%20Huang");
      await expect(page.getByRole("heading", { name: "Topics and collaborators" })).toBeVisible();

      const topicSection = page.locator("[data-topic-section]");
      const topicCards = topicSection.locator("[data-topic-card]");
      const topicList = topicSection.locator("[data-topic-list]");
      await expect.poll(async () => topicCards.count()).toBe(3);
      await expect(topicSection.getByText(/\d+ of \d+/)).toHaveCount(0);
      await page.getByRole("button", { name: "Generate more" }).click();
      await expect.poll(async () => topicCards.count()).toBe(6);
      await expect
        .poll(async () =>
          topicList.evaluate((element) => element.scrollHeight > element.clientHeight),
        )
        .toBe(true);

      await page.reload();
      await expect(page.getByRole("heading", { name: "Topics and collaborators" })).toBeVisible();
      await expect.poll(async () => topicCards.count()).toBeGreaterThanOrEqual(6);
    } finally {
      await page.request.post("/api/ideas/store", {
        data: {
          action: "saveTopicRecommendationCount",
          payload: {
            normalizedAuthorName: authorKey,
            visibleTopicCount: previousTopicCount ?? 3,
          },
        },
      });
    }
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

  test("legacy locked idea routes open the normal detail view", async ({ page }) => {
    await page.goto("/marketplace?author=Yun%20Huang");
    await expect(page.getByRole("heading", { name: "Shared idea board" })).toBeVisible();
    const yirenCard = page.locator("[data-marketplace-sticky]").filter({ hasText: "Yiren Liu" });
    await expect(yirenCard.first()).toBeVisible();
    const detailHref = await yirenCard
      .first()
      .locator("a[aria-label^='Open']")
      .getAttribute("href");
    if (!detailHref) throw new Error("marketplace detail href was missing");

    await page.goto(detailHref.replace("?", "/locked?"));
    await expect(page).not.toHaveURL(/\/locked/);
    await expect(page.getByRole("heading", { name: "Shared collaboration board" })).toBeVisible();
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
    await createUniqueDraft(page);
    await expect(page.getByText("Draft canvas", { exact: true })).toBeVisible({ timeout: 15_000 });

    const firstSticky = page.locator("[data-sticky-note]").first();
    await firstSticky.click();
    await page.getByRole("button", { name: "Enhance sticky with AI" }).click();
    await expect(page.getByRole("heading", { name: "Enhance sticky note" })).toBeVisible();
    await page.getByRole("button", { name: "Evidence" }).click();
    await page.getByRole("button", { name: "Apply to sticky" }).click();
    await expect(firstSticky.locator("[data-sticky-note-body]")).toContainText("Evidence to add");
  });

  test("draft canvas updates when another collaborator changes notes", async ({ page }) => {
    test.setTimeout(45_000);
    const ideaId = await createUniqueDraft(page);
    await expect(page.getByText("Draft canvas", { exact: true })).toBeVisible({ timeout: 15_000 });

    const remoteText = `REMOTE LIVE UPDATE ${Date.now()}`;
    const storeResponse = await page.request.get("/api/ideas/store");
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
    await expect(page.getByRole("heading", { name: "Published synthesis" })).toBeVisible({
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

  test("marketplace feedback is shared across browser contexts", async ({ browser }) => {
    test.setTimeout(45_000);
    const yunContext = await browser.newContext();
    const yirenContext = await browser.newContext();
    const yunPage = await yunContext.newPage();
    const yirenPage = await yirenContext.newPage();
    const sharedNote = `Cross-context marketplace note ${Date.now()}`;

    await createUniqueOpenIdea(yunPage);
    await yunPage.goto("/marketplace?author=Yun%20Huang");
    await expect(yunPage.getByRole("heading", { name: "Shared idea board" })).toBeVisible();
    await yunPage
      .locator("[data-marketplace-sticky]")
      .filter({ hasText: "E2E workflow draft" })
      .first()
      .hover();
    await yunPage.getByPlaceholder("Add a marketplace sticky note").fill(sharedNote);
    await yunPage.getByRole("button", { name: "Add sticky note" }).click();
    await expect(yunPage.locator("[data-feedback-sticky]").first()).toContainText(sharedNote, {
      timeout: 15_000,
    });

    await yirenPage.goto("/marketplace?author=Yiren%20Liu");
    await expect(yirenPage.getByRole("heading", { name: "Shared idea board" })).toBeVisible();
    await expect(yirenPage.getByText(sharedNote)).toBeVisible();

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
    const ideasLabel = page.getByText("My Ideas", { exact: true });
    const authorBox = await authorHeading.boundingBox();
    const publicationsBox = await publicationsHeading.boundingBox();
    const ideasBox = await ideasLabel.boundingBox();
    expect(authorBox).not.toBeNull();
    expect(publicationsBox).not.toBeNull();
    expect(ideasBox).not.toBeNull();
    if (!authorBox || !publicationsBox || !ideasBox) {
      throw new Error("dashboard section ordering was not measurable");
    }
    expect(authorBox.y + authorBox.height).toBeLessThan(publicationsBox.y);
    expect(publicationsBox.y).toBeLessThan(ideasBox.y);

    await expect(page.getByRole("heading", { name: "Topics and collaborators" })).toBeVisible();
    await dismissTutorialIfPresent(page);
    const firstTopic = page.locator("[data-topic-card]").first();
    await expect(firstTopic).toBeVisible();
    await firstTopic.locator("[data-collaborator-name]").first().click();
    await expect(firstTopic.locator("[data-collaborator-work]")).toBeVisible();
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
    await expect(page.getByRole("heading", { name: "Published synthesis" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(customNote).first()).toBeVisible();
    await expect(page.getByText("Owner controls")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit fields" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Iterate with AI" })).toHaveCount(0);

    const marketplaceSticky = "Marketplace sticky note from E2E";
    await page.getByRole("link", { name: "Marketplace" }).click();
    await expect(page.getByRole("heading", { name: "Shared idea board" })).toBeVisible();
    const marketplaceCard = page.locator("[data-marketplace-sticky]").first();
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
    await page.getByPlaceholder("Add a marketplace sticky note").fill(marketplaceSticky);
    await page.getByRole("button", { name: "Add sticky note" }).click();
    await expect(page.locator("[data-feedback-sticky]").first()).toContainText(marketplaceSticky, {
      timeout: 15_000,
    });
    await page.getByRole("link", { name: "Open detail" }).click();
    await expect(page.getByRole("heading", { name: "Shared collaboration board" })).toBeVisible();
    await expect(page.locator("[data-board-viewport]")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Published synthesis" })).toBeVisible();

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
