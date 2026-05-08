# ResearchGit V2 Specification

Status: Approved implementation target
Last updated: 2026-05-07
Supersedes: `archive/SPECv0.md`, `archive/SPECv1.md`

Implementation note: the current repo ships a deterministic, testable V2 prototype for the full
phase flow using `papers_by_room.json` directly. External services remain wired for later
integration, but local routes and tests no longer depend on the deleted `public/catalog` assets.

---

## 1. Context

ResearchGit V2 is a research-ideation platform for CHI 2026 authors. A user signs in with Google, resolves their identity against the CHI 2026 paper list in `papers_by_room.json`, receives broader topic recommendations, enters shared topic canvases, develops private idea drafts when needed, gathers structured comments, iterates with AI, and can keep final work private to the owner.

V2 replaces both earlier directions:

- V0: swipe deck plus per-user branches.
- V1: lab-style co-design probe around shared sticky-note canvases and topical clusters.

V2 keeps the stronger parts of each:

- Workflow and lifecycle come from `research-idea-platform-spec.md`.
- Visual language and canvas feel come from the Atomic Ideation prototype.

The authoritative dataset is `papers_by_room.json`, which contains the CHI 2026 program and serves as both the paper database and the author lookup source.

---

## 2. Product Definition

### 2.1 In scope

- Google OAuth sign-in.
- CHI-author name disambiguation against `papers_by_room.json`.
- Dashboard with authored papers, broader topic recommendations, marketplace access, and the user's ideas.
- AI idea generation from selected papers or full publication history.
- Owner-author sticky-note draft canvas with store-synchronized updates across same-author sessions.
- AI enhancement for sticky-note text with selectable refinement modes.
- Explicit AI clustering of stickies into at most 3 themes.
- AI synthesis from canvas to a publishable structured idea.
- Shared topic canvases with sticky notes, same-topic paper anchors, comments, and generated analysis reports.
- Shared marketplace for open ideas.
- Typed comment threads with one reply level.
- AI-assisted iteration of published ideas.
- Owner-only private state for ideas that should no longer be visible to others.

### 2.2 Out of scope

- Non-CHI users.
- Liveblocks CRDT rooms, multiplayer cursors, and conflict-free canvas editing.
- Post-lock recruiting, bidding, or collaborator matchmaking workflows.
- Literal talk or pitch playback features.
- Production publication-ingestion automation.
- Billing and model-routing concerns.
- Contributor analysis reports.

---

## 3. Locked Decisions

1. Workflow supports private per-idea drafts and public broader-topic canvases.
2. The authoritative paper source is `papers_by_room.json`.
3. Login is Google OAuth followed by author-name matching.
4. Users with no CHI 2026 author match are blocked from onboarding.
5. One pasted thought creates one sticky. There is no AI atomization step.
6. All stickies share one shape. There are no sticky types.
7. AI appears in modal workflows, not as on-canvas entities.
8. Only the owner-author edits a private draft canvas. Any matched CHI 2026 author can edit a public topic canvas.
9. Comments use the existing 6-emoji reaction set: `👍 👎 🎯 💡 ⚠️ ❓`. Stickies store text, theme, layout, and author metadata.
10. Theme clustering is user-triggered and produces at most 3 themes.
11. Publishing synthesizes structured idea fields from the stickies and cluster labels.
12. Private ideas use the same detail UI as open ideas, but access is restricted to the owner-author.
13. Recommendation behavior is local and topic-based over `papers_by_room.json`.
14. The stack remains Next.js 16, TypeScript strict mode, Neo4j, and Auth.js v5. Current live updates use idea-store broadcasts, storage events, focus refresh, and polling.

---

## 4. End-to-End Flow

```text
/login
  -> /dashboard
  -> /ideas/new
  -> /ideas/[id]/draft
  -> publish
  -> /marketplace
  -> /ideas/[id]
  -> comment, iterate, or keep private
```

### 4.1 Login

- User signs in with Google.
- User enters their name.
- The system matches the name against the unique author set in `papers_by_room.json`.
- If multiple matches exist, the user chooses from a disambiguation modal showing candidate names and example papers.
- If no match exists, onboarding stops with retry and contact-admin paths.

### 4.2 Dashboard

The dashboard combines four surfaces:

- Authored CHI papers.
- The user's draft, open, and private ideas.
- Broader topic recommendations generated from CHI 2026 session groups.
- An inline topic workspace after the user joins a topic.

The user can generate ideas in two modes:

- From selected papers.
- From all experience.

### 4.3 Idea generation

- The system produces 2-3 grounded idea cards.
- Each card contains a title, hypothesis, method sketch, novelty, and grounding citations.
- The user chooses one card to develop.
- The hard limit is 3 cards to avoid overwhelming the user.

### 4.4 Draft canvas

- The draft canvas is private to the owner-author.
- The user creates, edits, drags, resizes, searches, and AI-enhances stickies.
- Same-author sessions receive updates through the idea-store subscription and polling path.
- The user can request `Suggest themes`, which clusters existing stickies into at most 3 groups and overlays theme labels.
- Clustering is reversible by rerunning it and does not publish automatically.

### 4.5 Publish

- Publish opens an AI synthesis modal.
- AI reads the current stickies and theme labels and produces structured idea fields.
- The user reviews and edits those fields before confirming publish.
- After publish, the idea becomes `open` and appears in the marketplace.

### 4.6 Marketplace and public idea detail

- Marketplace lists open ideas.
- Users can browse, sort, filter, upvote, and open idea details.
- Contributors comment on the published idea body, not on the canvas.

### 4.7 Initiator detail

The initiator sees the same published idea detail as other users, with owner-author canvas write access:

- Refine the published canvas while the idea remains visible.
- Review structured comment threads.
- Use selected feedback for later AI iteration flows.

### 4.8 Private idea

- Private ideas are accessible only to their owner-author.
- A private idea uses the same detail page as an open idea.

---

## 5. System Architecture

```text
Browser
  - login
  - dashboard
  - draft canvas
  - marketplace
  - idea detail
        |
        v
Next.js 16 App Router
  - auth flow
  - author match route
  - idea-store lifecycle route
  - sticky persistence through idea records
  - comment and reaction persistence through idea records
  - publish, iterate, and private-state transitions
        |
        +--> Neo4j AuraDB
        |     - User
        |     - Idea
        |     - IdeaVersion
        |     - Sticky
        |     - Comment
        |     - embedded comment reactions
        |
        +--> OpenAI API
        |     - idea generation
        |     - theme clustering
        |     - publish synthesis
        |     - idea iteration
        |
        +--> papers_by_room.json
              - CHI 2026 source catalog
              - topic grouping and recommendation source
```

---

## 6. Data Model

> **Architecture note (V2):** `Paper` and `Author` are NOT Neo4j nodes. They
> are loaded in-memory from `papers_by_room.json` at module init by
> `src/lib/papers/catalog.ts`. The CHI 2026 program is read-only reference
> data; storing it in Neo4j adds operational cost (ingest step, sync drift)
> with no graph-traversal benefit. Neo4j stores only the dynamic per-user
> state below. The user's CHI identity is a string property
> (`User.matchedAuthorName`) that joins to the in-memory catalog.

Neo4j is the system of record for dynamic state.

### 6.1 Nodes

```cypher
(:User {
  id: uuid, googleId, googleEmail,
  name, affiliation, avatarUrl,
  colorToken,
  matchedAuthorName: string?,           -- joins to in-memory Author by name
  onboardingCompleted: bool, createdAt
})

(:Idea {
  id: uuid,
  initiatorUserId,
  status: 'draft'|'open'|'locked',
  title, hypothesis, methodology, novelty,
  createdAt, updatedAt, upvotes
})

(:IdeaVersion {
  id: uuid, ord: int,
  trigger: 'manual'|'ai_quick_action'|'ai_custom_prompt'|'ai_iteration',
  snapshot, createdAt
})

(:Sticky {
  id, ideaId, x, y, width, height,
  text, themeIndex: int|null, themeColorToken,
  createdAt, updatedAt
})

(:Comment {
  id, ideaId, authorUserId, parentCommentId?,
  type: 'general'|'method_critique'|'related_work'|'experiment_idea'|'concern',
  body, createdAt, editedAt,
  reactions: map
})
```

### 6.2 Relationships

```cypher
(:User)-[:INITIATED]->(:Idea)
(:Idea)-[:HAS_STICKY]->(:Sticky)
(:Idea)-[:HAS_VERSION]->(:IdeaVersion)
(:IdeaVersion)-[:REFERENCES_STICKY]->(:Sticky)
(:Idea)-[:HAS_COMMENT]->(:Comment)
(:Comment)-[:REPLY_TO]->(:Comment)
(:User)-[:AUTHORED]->(:Comment)
(:User)-[:UPVOTED]->(:Idea)
```

### 6.3 Constraints and indexes

```cypher
CREATE CONSTRAINT user_id        IF NOT EXISTS FOR (u:User)        REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT user_google    IF NOT EXISTS FOR (u:User)        REQUIRE u.googleId IS UNIQUE;
CREATE CONSTRAINT idea_id        IF NOT EXISTS FOR (i:Idea)        REQUIRE i.id IS UNIQUE;
CREATE CONSTRAINT version_id     IF NOT EXISTS FOR (v:IdeaVersion) REQUIRE v.id IS UNIQUE;
CREATE CONSTRAINT sticky_id      IF NOT EXISTS FOR (s:Sticky)      REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT comment_id     IF NOT EXISTS FOR (c:Comment)     REQUIRE c.id IS UNIQUE;
CREATE INDEX idea_status         IF NOT EXISTS FOR (i:Idea)        ON (i.status);
CREATE INDEX idea_updated        IF NOT EXISTS FOR (i:Idea)        ON (i.updatedAt);
CREATE INDEX comment_idea        IF NOT EXISTS FOR (c:Comment)     ON (c.ideaId);
CREATE INDEX user_matched_author IF NOT EXISTS FOR (u:User)        ON (u.matchedAuthorName);
```

---

## 7. Routes and Code Layout

### 7.1 App routes

```text
src/app/
  layout.tsx
  page.tsx
  login/page.tsx
  dashboard/page.tsx
  ideas/new/page.tsx
  ideas/[id]/draft/page.tsx
  ideas/[id]/page.tsx
  topics/[id]/page.tsx
  marketplace/page.tsx
  api/auth/[...nextauth]/route.ts
  api/authors/match/route.ts
  api/ideas/store/route.ts
  api/onboarding/complete/route.ts
  api/telemetry/batch/route.ts
```

### 7.2 Libraries and services

```text
src/lib/
  auth.ts
  neo4j.ts
  papers/
    catalog.ts
  recommendation/
    algorithm.md
    index.ts
    scoring.ts
  llm/
    client.ts
    prompts.ts
    schema.ts
  canvas/
    ai-enhance.ts
    board-utils.ts
    schema.ts
    theme-styles.ts
  ideas/
    client-store.ts
    fields.ts
    index.ts
    store.ts

src/server/
  user-service.ts
  idea-store-service.ts
```

### 7.3 UI surface

```text
src/components/
  canvas/
  v2/
    dashboard/
    idea-detail/
    AuthorLogin.tsx
    DashboardClient.tsx
    IdeaDetailClient.tsx
    IdeaDraftClient.tsx
    IdeaGenerationClient.tsx
    MarketplaceClient.tsx
```

---

## 8. Recommendation Engine

Recommendation quality is central to V2. The repository documents the deterministic topic engine in `src/lib/recommendation/algorithm.md` and builds recommendations directly from `papers_by_room.json`.

The local portable engine provides:

- broader topic recommendation through same-topic CHI 2026 paper groups,
- paper recommendation through the same topic ranking model,
- shared topic canvases with paper anchors, sticky notes, comments, and generated analysis reports.

---

## 9. Visual Language

ResearchGit V2 uses the Atomic Ideation aesthetic with a product rename and simplified interaction model.

### 9.1 Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F4EFE7` | page background |
| `--bg-elev` | `#FFFFFF` | cards and modals |
| `--ink` | `#1B1B1B` | body text |
| `--ink-2` | `#4F4A41` | section headers |
| `--muted` | `#8A847A` | helper text |
| `--line` | `#E5DFD3` | dividers |
| `--u-rose` / `--u-amber` / `--u-citron` / `--u-mint` / `--u-sky` / `--u-iris` | pastel signature colors | users and theme groupings |
| `--f-serif` | `Lora` or `Playfair Display` | headlines |
| `--f-hand` | handwritten italic | accent words |
| `--f-mono` | `Geist Mono` or `JetBrains Mono` | compact metadata |

### 9.2 Interaction rules

- Sticky notes may use slight rotation, typically within plus or minus 1.5 degrees.
- The sticky body shows text, author, theme grouping, and stable folded sizing.
- Draft actions include edit, drag, resize, search, AI enhancement, and AI suggested theme grouping.
- Idea-generation output is capped at 3 cards.
- Recommended papers default to a compact view instead of dumping long lists.

---

## 10. Comment, Iteration, and Private Semantics

### 10.1 Comment types

Every comment must have one of:

- `general`
- `method_critique`
- `related_work`
- `experiment_idea`
- `concern`

Threading depth is 1. Replies attach only to top-level comments.

### 10.2 Versions and iteration

- The owner-author can create saved versions through publish, manual restore, and AI draft enhancement.
- Each accepted version stores structured idea fields and the sticky-note snapshot used for that version.
- Published comment selection remains structured feedback for later iteration flows.

### 10.3 Private ideas

- Private ideas retain the `locked` status value for backward-compatible persisted data.
- Private ideas are omitted from the shared marketplace for non-owners.
- Non-owners cannot read, edit, upvote, or comment on private ideas.
- Private ideas do not have a separate report UI or backend model.

---

## 11. V1 Cleanup Requirements

The following V1-specific areas are not part of V2 and should be removed or replaced during implementation:

- `src/server/deck-service.ts`
- the V1 version of `src/server/idea-service.ts`
- `src/server/canvas-service.ts`
- `src/server/export-service.ts`
- `src/lib/catalog/`
- `src/lib/canvas/intent-styles.ts`
- V1 intent-picker canvas UI under `src/components/canvas/`
- `src/components/deck/`
- `src/components/admin/RegeneratePanel.tsx`
- `src/app/admin/regenerate/`
- `src/app/api/admin/regenerate/`
- `src/app/deck/`
- the V1 `src/app/idea/[id]/` flow
- `src/lib/deck/contracts.ts`
- ResearchGalaxy-specific scripts and catalog assets
- V1 Neo4j entities tied to Deck and Cluster flows

The following pieces stay and are reused:

- `src/components/canvas/useStickyBoardController.ts`
- `src/lib/neo4j.ts`
- `src/lib/auth.ts`
- `src/proxy.ts`
- `src/lib/llm/client.ts`
- TypeScript strict mode, Biome, pnpm, and the existing workspace tooling

---

## 12. Verification

- `pnpm typecheck` must pass under strict TypeScript settings.
- `pnpm check` must cover the relevant source and script directories.
- Vitest should cover name lookup, recommendation scoring, prompt builders, and theme-clustering schema parsing.
- Playwright should cover login, author match, dashboard rendering, generation, draft editing, publish, comment, iteration, and private idea access restrictions.
- Recommendation inspection findings must be written to `src/lib/recommendation/algorithm.md`.
- Accessibility checks should run with `@axe-core/playwright`.

---

## 13. Risks and Fallbacks

- If the CHI 2026 catalog changes, keep the local deterministic recommendation engine stable and update `src/lib/recommendation/algorithm.md` with the new grouping behavior.
- If author names in `papers_by_room.json` are inconsistent, the lookup layer must normalize case, punctuation, and diacritics and support disambiguation.
- If AI synthesis from stickies is poor, the publish modal remains editable before the idea can be opened.
- If users outside CHI 2026 expect access, the product intentionally blocks them in V2.
