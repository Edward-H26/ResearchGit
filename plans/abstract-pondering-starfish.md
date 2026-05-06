# ResearchGit V2 — Implementation Plan

> Status: **Interview complete (4 rounds, 16 questions). Awaiting plan approval.**
> Replaces the V1 plan that previously lived in this file.
> V0 (`archive/SPECv0.md`) and V1 (`archive/SPECv1.md`) are reference-only.

---

## 1. Context

### 1.1 Why V2

V0 was a swipe-deck + per-user branches model. V1 was an HCI co-design probe with sticky-note canvases keyed off topical clusters of CHI papers. Both were paradigm-narrow and lab-scoped. V2 reframes as a real product: a research-ideation platform that takes a CHI 2026 author's published work and (a) recommends related papers + potential collaborators, then (b) helps them develop a research idea on a sticky-note canvas with AI clustering, publish, gather typed comments, AI-iterate, and lock with a contributor analysis report.

### 1.2 Two source documents merged

The V2 design synthesizes two reference artifacts that the user explicitly named:

- **`research-idea-platform-spec.md`** (41 KB, in repo root) — the **workflow source-of-truth**. Defines 8 screens (login → dashboard → idea generation → draft editor → marketplace → idea detail × 2 → lock + report), data contracts, edge cases, accessibility, responsive behavior. V2 follows this end-to-end.
- **`/Users/edwardhu/Downloads/Atomic Ideation/`** (full JSX prototype + 8 screenshots + Chinese design-context doc) — the **visual + atomic-canvas reference**. Provides the aesthetic (cream paper-bg, serif headlines + handwritten italic, color-signature dots, pastel sticky notes), the "Atomic ideation" wordmark, and the atomization mechanic.

Where they conflict, the workflow comes from `research-idea-platform-spec.md` and the visual treatment + canvas mechanics come from Atomic Ideation. Specific cuts are in §3 (Decisions locked).

### 1.3 Data realities

- **`papers_by_room.json`** (4.3 MB, repo root) is the CHI 2026 program: 30 conference rooms, each with 30–60 papers as `{ title, authors[], abstract, date, url }`. Total ≈ 2,785 papers (per papersclaw.fun's stated count). This is V2's authoritative paper DB and author lookup table.
- **`papersclaw.fun`** is closed-source; uses the same CHI 2026 papers; has ~200 Gmail-authenticated users and recommends papers to each user. **V2 will reverse-engineer papersclaw's recommendation logic via local browser inspection** (chrome-devtools / Playwright) as the first implementation task in Phase 1.
- **First-author test users** the user named: Ziyi, Yiren, Hyanghee. They are real CHI 2026 authors. V2 must work for them with their actual papers.

---

## 2. Verified facts (Plan-mode pass)

- `archive/SPECv0.md` (35.6 KB) and `archive/SPECv1.md` (2.7 KB) exist and are out-of-band; current `SPEC.md` is a 129-byte stub waiting for V2 content.
- `/Users/edwardhu/Downloads/Atomic Ideation/` contains: `app.jsx` (orchestrator), `chrome.jsx` (TopNav), `components.jsx` (shared), `data.jsx` (29 KB of fixture data), `screen-lobby.jsx`, `screen-overview.jsx`, `screen-domain.jsx` (37.9 KB — the core atomized canvas), `screen-subtopic.jsx`, `screen-atomize.jsx`, `screen-extras.jsx`, `tweaks-panel.jsx`, `styles.css` (18.7 KB), `Atomic Ideation.html` (162 KB bundled), `screenshots/` (PNG/JPG of every screen), and `uploads/设计上下文文档.md` (the Chinese design-context doc).
- Existing V1 codebase under `src/` has: `useStickyBoardController` (canvas math reusable), Liveblocks scaffold (`src/lib/liveblocks/`), Auth.js v5 + Google OAuth (`src/lib/auth.ts`, `src/proxy.ts`), Neo4j driver helpers (`src/lib/neo4j.ts`), idea/deck/cluster services. The Deck/Cluster paradigm is gone in V2; the canvas controller stays.
- TypeScript preference (`.notes/typescript-preference.md`): strict + Zod at boundaries + Biome + typed env. Applies unchanged.

---

## 3. Decisions locked (from interview, 16 questions across 4 rounds)

| # | Decision | Source |
|---|---|---|
| **D1** | **Workflow = `research-idea-platform-spec.md` per-idea unit.** One initiator creates an idea; others comment; lock + report finishes it. NOT Atomic Ideation's domain-emergence model. | Q9 |
| **D2** | **Visual language = Atomic Ideation prototype.** Cream paper-bg (`#F4EFE7`-ish), serif headlines (Lora/Playfair-style), handwritten italic accents (`var(--f-hand)` in the JSX), pastel user color signatures (rose/amber/citron/mint/sky/iris), soft shadows + slight sticky-note rotation. Wordmark "Atomic ideation" is replaced by "ResearchGit" but the type-pairing stays. | Q4, Q6 |
| **D3** | **Login = Google OAuth → CHI name disambiguation.** Sign in with Google, then enter your name. System matches the name against the unique authors set in `papers_by_room.json`. Multiple matches → disambiguation modal listing each candidate with their first matched paper + venue. | Q7, Q12 |
| **D4** | **No-CHI-match = hard-block.** If the user's name has zero matches in `papers_by_room.json`, refuse profile creation. Show retry + "contact admin" path. No fallback "borrowed background" mode. Per-spec §7. | Q14 |
| **D5** | **Sticky note model = 1 paste = 1 sticky.** No AI auto-splitting, no atomization preview modal. User writes whatever they want into a single sticky; the app does not pre-process it. AI's role is post-hoc clustering, not decomposition. | Q13 |
| **D6** | **No atom types.** Drop Atomic Ideation's three-type system (human / literature / AI). Every sticky is the same shape — a user-authored note. AI shows up only inside MODALS (idea generation, theme clustering, AI iteration), never as on-canvas atoms. Literature shows up as paper chips in the idea card's Grounding section, not on the canvas. | Q19 |
| **D7** | **No typed reactions.** Drop Atomic Ideation's 5-relation system (Support / Challenge / Refine / Question / Cite). Keep V1's 6-emoji reaction bar (👍 👎 🎯 💡 ⚠️ ❓) on stickies and on comments. | Q10 |
| **D8** | **Single-user canvas.** Only the idea's initiator edits stickies on their canvas. Others contribute via the comment thread on the idea detail page (per ref spec §4.6). No real-time co-editing. Liveblocks library stays installed but the room/storage layer is dormant in V2. | Q18 |
| **D9** | **Recommendation algorithm = reverse-engineered from papersclaw.fun.** First implementation task in Phase 1 is to launch a local browser (chrome-devtools or Playwright), sign into papersclaw.fun, observe the recommendation behavior for the 3 first authors, capture network traffic + DOM, and document the algorithm in `src/lib/recommendation/algorithm.md`. Then implement the same logic over `papers_by_room.json`. | Q15 |
| **D10** | **Stack reuse from V1 (all four kept).** Next.js 16 (App Router) + TypeScript strict + Biome + pnpm; Neo4j AuraDB; Liveblocks library (kept; dormant); Auth.js v5 + Google OAuth + ADMIN_EMAILS gate + `src/proxy.ts`. | Q8 |
| **D11** | **Scope = full `research-idea-platform-spec.md` end-to-end.** Phase 1 includes ALL 8 screens (login → dashboard → generate → draft → marketplace → detail-public → detail-initiator → lock+report). No staged rollout. | Q17 |
| **D12** | **Comment types per ref spec §4.6.** Five types on every comment: `general`, `method_critique`, `related_work`, `experiment_idea`, `concern`. Threading depth = 1 (replies attach to a top-level comment). Per ref spec. | Ref spec §4.6 |
| **D13** | **Lock ceremony per ref spec §4.8.** Modal requires the user to type "LOCK" verbatim. Idea body becomes read-only; comments preserved read-only; contributor analysis report (by absorption / by volume / by type / suggested acknowledgments) renders in place of the owner toolbar. | Ref spec §4.8 |
| **D14** | **AI 3-theme clustering = explicit "Suggest themes" button.** User writes stickies, then clicks a button on the canvas chrome. AI clusters the existing stickies into ≤3 themes; recolors stickies into 3 pastel groups (per Atomic Ideation user-color palette) and overlays 3 floating theme-name labels. User can re-trigger; the result is not auto-saved into the published idea until the user publishes a version. | Q16, Q4 |
| **D15** | **Idea publication = AI synthesis from stickies.** When the initiator clicks "Publish to Marketplace", AI reads the canvas + the 3 cluster labels and synthesizes the structured idea fields (title, hypothesis, methodology, novelty bullets, grounding citations) per the ref spec §6.3 schema. The initiator reviews + edits the synthesized fields before final publish. | New, derived from D5+D11 |
| **D16** | **Drop V1 deck/cluster code.** Remove: `src/server/deck-service.ts` (regen + getActiveDeck), `src/server/idea-service.ts` (V1 schema), `src/lib/catalog/`, `src/app/admin/regenerate/`, `src/app/api/admin/regenerate/`, `src/app/deck/`, `src/app/idea/[id]/`, `src/components/deck/`, V1 IdeaCard, V1 ReviseDialog. Their replacements are in §6 below. | New, scope cleanup |

---

## 4. Architecture overview

```
                  ┌─────────────────────────────────────────────────────────┐
                  │  Browser (researcher)                                   │
                  │                                                         │
                  │  /login → /dashboard → /ideas/new → /ideas/[id]/draft   │
                  │            ↓                              ↓             │
                  │       /marketplace ←───────  /ideas/[id]                │
                  │                                  ↓                      │
                  │                          /ideas/[id]/locked             │
                  └────┬───────────────────────────────────────────┬────────┘
                       │ NextAuth session                          │ Server Actions + Route Handlers
                       ▼                                           ▼
              ┌────────────────┐                    ┌──────────────────────────────┐
              │ Auth.js v5     │                    │ Next.js 16 App Router        │
              │ Google OAuth   │                    │  - login lookup              │
              │ + name match   │                    │  - generate ideas (OpenAI)   │
              └────────┬───────┘                    │  - sticky CRUD (server)      │
                       │                            │  - cluster themes (OpenAI)   │
                       │                            │  - synthesize idea (OpenAI)  │
                       ▼                            │  - publish / lock            │
              ┌────────────────┐                    │  - comment CRUD              │
              │ Neo4j AuraDB   │ ◀──────────────────┤  - iterate w/ AI             │
              │ - User         │                    │  - contributor report        │
              │ - Paper        │                    └──────────────┬───────────────┘
              │ - Author       │                                   │
              │ - Idea         │                    ┌──────────────▼───────────────┐
              │ - IdeaVersion  │                    │ OpenAI API                   │
              │ - Sticky       │                    │  - structured outputs (Zod)  │
              │ - Comment      │                    └──────────────────────────────┘
              │ - Reaction     │                    
              │ - LockReport   │                    ┌──────────────────────────────┐
              └────────────────┘                    │ papersclaw.fun (read-only)   │
                                                    │  reverse-engineered as       │
                                                    │  src/lib/recommendation/     │
                                                    └──────────────────────────────┘
```

---

## 5. Data model (Neo4j)

### 5.1 Nodes

```cypher
(:User {
  id: uuid, googleId, googleEmail,
  name,                                  // canonical CHI-author name (matched at login)
  affiliation,                           // pulled from CHI paper authors metadata
  avatarUrl,
  colorToken,                            // one of: rose|amber|citron|mint|sky|iris (Atomic Ideation user color)
  onboardingCompleted: bool, createdAt
})

(:Paper {
  paperId,                               // hash of (title + first author) since papers_by_room.json has no canonical ID
  title, abstract, date, url,
  sessionRoom                            // e.g., "P1 - Room 114"
})

(:Author {
  name,                                  // canonical name from papers_by_room.json
  affiliation                            // best-effort; nullable
})

(:Idea {
  id: uuid,
  initiatorUserId, status: 'draft'|'open'|'locked',
  title, hypothesis, methodology, novelty: [string],   // synthesized from canvas at publish time
  createdAt, updatedAt, lockedAt, upvotes
})

(:IdeaVersion {
  id: uuid, ord: int,                    // 0 = initial publish; 1+ = post-iteration
  trigger: 'manual'|'ai_quick_action'|'ai_custom_prompt'|'ai_iteration',
  snapshot,                              // JSON: {title, hypothesis, methodology, novelty, stickyIds[], themeLabels[]}
  createdAt
})

(:Sticky {
  id, ideaId, x, y, width, height,
  text, themeIndex: int|null,            // -1 if uncategorized; 0/1/2 after AI clustering
  themeColorToken,                       // pastel token (mint|sky|amber|rose|...) assigned by AI clustering
  createdAt, updatedAt
})

(:Comment {
  id, ideaId, authorUserId, parentCommentId?,
  type: 'general'|'method_critique'|'related_work'|'experiment_idea'|'concern',
  body, createdAt, editedAt,
  markedHelpful: bool,                   // initiator-private
  absorbedInVersionIds: [uuid]
})

(:Reaction {
  kind: 'thumbs_up'|'thumbs_down'|'target'|'bulb'|'warning'|'question',
  createdAt
})

(:LockReport {
  id, ideaId, lockedAt,
  byAbsorption: [{userId, count, areas}],
  byVolume: [{userId, count}],
  byType: { method_critique, related_work, experiment_idea, general, concern },
  suggestedAcknowledgmentsText
})
```

### 5.2 Relationships

```cypher
(:Author)-[:WROTE]->(:Paper)
(:Paper)-[:IN_SESSION]->(:Session {room})            // optional; room is also denormalized on Paper
(:User)-[:IDENTIFIED_AS]->(:Author)                  // 1:1; resolved at login
(:User)-[:INITIATED]->(:Idea)
(:Idea)-[:GROUNDED_IN]->(:Paper)                     // 1..N; the user's selected papers
(:Idea)-[:HAS_STICKY]->(:Sticky)
(:Idea)-[:HAS_VERSION]->(:IdeaVersion)
(:IdeaVersion)-[:REFERENCES_STICKY]->(:Sticky)       // snapshot pointer
(:Idea)-[:HAS_COMMENT]->(:Comment)
(:Comment)-[:REPLY_TO]->(:Comment)                   // depth-1 only
(:User)-[:AUTHORED]->(:Comment)
(:User)-[:UPVOTED]->(:Idea)                          // toggle
(:User)-[:REACTED { kind }]->(:Sticky | :Comment)
(:Idea)-[:HAS_REPORT]->(:LockReport)                 // 0 or 1; only when locked
```

### 5.3 Constraints + indexes

```cypher
CREATE CONSTRAINT user_id        IF NOT EXISTS FOR (u:User)        REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT user_google    IF NOT EXISTS FOR (u:User)        REQUIRE u.googleId IS UNIQUE;
CREATE CONSTRAINT paper_id       IF NOT EXISTS FOR (p:Paper)       REQUIRE p.paperId IS UNIQUE;
CREATE CONSTRAINT author_name    IF NOT EXISTS FOR (a:Author)      REQUIRE a.name IS UNIQUE;
CREATE CONSTRAINT idea_id        IF NOT EXISTS FOR (i:Idea)        REQUIRE i.id IS UNIQUE;
CREATE CONSTRAINT version_id     IF NOT EXISTS FOR (v:IdeaVersion) REQUIRE v.id IS UNIQUE;
CREATE CONSTRAINT sticky_id      IF NOT EXISTS FOR (s:Sticky)      REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT comment_id     IF NOT EXISTS FOR (c:Comment)     REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT report_id      IF NOT EXISTS FOR (r:LockReport)  REQUIRE r.id IS UNIQUE;
CREATE INDEX idea_status         IF NOT EXISTS FOR (i:Idea)        ON (i.status);
CREATE INDEX idea_updated        IF NOT EXISTS FOR (i:Idea)        ON (i.updatedAt);
CREATE INDEX comment_idea        IF NOT EXISTS FOR (c:Comment)     ON (c.ideaId);
CREATE INDEX paper_session       IF NOT EXISTS FOR (p:Paper)       ON (p.sessionRoom);
```

---

## 6. Routes + folder layout

```
src/
├── app/
│   ├── layout.tsx                       # Atomic Ideation typography (serif + handwritten + paper-bg)
│   ├── page.tsx                         # public landing
│   ├── login/page.tsx                   # ref spec §4.1; Google + name disambiguation
│   ├── dashboard/page.tsx               # ref spec §4.2; CHI papers + recommended papers + recommended collaborators
│   ├── ideas/
│   │   ├── new/page.tsx                 # ref spec §4.3; idea generation cards
│   │   └── [id]/
│   │       ├── page.tsx                 # ref spec §4.6 (public) or §4.7 (initiator) — RSC chooses by session
│   │       ├── draft/page.tsx           # ref spec §4.4; sticky canvas (Atomic Ideation aesthetic)
│   │       └── locked/page.tsx          # ref spec §4.8; contributor analysis report
│   ├── marketplace/page.tsx             # ref spec §4.5
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # kept from V1
│   │   ├── recommendations/route.ts     # GET papers + collaborators for current user
│   │   ├── ideas/generate/route.ts      # POST → 2-3 idea cards (OpenAI structured)
│   │   ├── ideas/route.ts               # POST create-from-canvas; GET list
│   │   ├── ideas/[id]/route.ts          # GET + PATCH (initiator only)
│   │   ├── ideas/[id]/publish/route.ts  # POST: synthesize fields from canvas → status='open'
│   │   ├── ideas/[id]/lock/route.ts     # POST: typed-LOCK confirmation → status='locked' + generate report
│   │   ├── ideas/[id]/iterate/route.ts  # POST: AI v2 from selected comments
│   │   ├── stickies/route.ts            # POST/PATCH/DELETE for canvas
│   │   ├── stickies/cluster/route.ts    # POST → AI returns 3 themes + per-sticky themeIndex
│   │   ├── comments/route.ts            # POST/PATCH/DELETE
│   │   ├── reactions/route.ts           # POST toggle
│   │   ├── upvotes/route.ts             # POST toggle
│   │   └── admin/
│   │       └── ingest/route.ts          # admin-only: re-ingest papers_by_room.json
│   └── auth/onboarding/page.tsx         # 3-step Atomic Ideation onboarding modal (per ref spec §2.1 / Atomic Ideation §A.1)
├── components/
│   ├── login/NameDisambiguation.tsx
│   ├── dashboard/
│   │   ├── PublicationsList.tsx         # CHI papers, sortable, multi-select
│   │   ├── RecommendedPapers.tsx        # papersclaw-style "Recommended for you"
│   │   ├── RecommendedCollaborators.tsx # paired "With You" + "Stretch You" tracks
│   │   └── MyIdeasList.tsx              # Draft / Open / Locked
│   ├── ideas/
│   │   ├── IdeaGenerationCards.tsx      # 2-3 cards from ref spec §4.3
│   │   ├── DraftCanvas.tsx              # sticky canvas (port useStickyBoardController)
│   │   ├── ThemesOverlay.tsx            # 3 floating theme labels + colored hulls
│   │   ├── PublishSynthesizer.tsx       # AI synth-to-fields preview before publish
│   │   ├── PublishedIdeaBody.tsx        # read-only render of structured fields
│   │   ├── CommentComposer.tsx          # body + type radio
│   │   ├── CommentThread.tsx            # depth-1 threading
│   │   ├── OwnerToolbar.tsx             # initiator-only: Edit / Iterate / Lock
│   │   ├── IterateDialog.tsx            # selected-comments + iteration goal → diff view
│   │   ├── LockDialog.tsx               # typed-LOCK confirmation
│   │   └── ContributorReport.tsx        # by absorption / by volume / by type / acks text
│   ├── marketplace/MarketplaceList.tsx
│   ├── shared/
│   │   ├── DiffView.tsx                 # per ref spec §5.3
│   │   ├── StatusBadge.tsx              # Draft / Open / Locked
│   │   ├── ColorSignature.tsx           # row of colored dots (Atomic Ideation lobby motif, repurposed)
│   │   ├── PaperChip.tsx
│   │   └── ReactionBar.tsx              # 6-emoji bar from V1
│   └── ui/                              # shadcn primitives + Atomic Ideation tokens
├── lib/
│   ├── neo4j.ts                         # kept (V1 driver helpers)
│   ├── auth.ts                          # kept; expanded jwt callback to do CHI name match
│   ├── auth/guards.ts                   # kept
│   ├── papers/
│   │   ├── ingest.ts                    # parse papers_by_room.json → Author/Paper/Session writes
│   │   ├── lookup.ts                    # name → matching Author rows; multi-match handling
│   │   └── contracts.ts                 # Zod for Paper, Author, Session
│   ├── recommendation/
│   │   ├── algorithm.md                 # PHASE 1 OUTPUT: documented papersclaw algorithm
│   │   ├── papers.ts                    # recommend papers given a user's authored papers
│   │   ├── collaborators.ts             # recommend authors (With You + Stretch You)
│   │   └── embed.ts                     # OpenAI embedding helper if algorithm requires
│   ├── llm/
│   │   ├── client.ts                    # OpenAI singleton (kept; prune temperature override)
│   │   ├── prompts.ts                   # generateIdeas, clusterThemes, synthesizeIdea, iterateIdea, suggestAcknowledgments
│   │   └── schema.ts                    # Zod for all LLM outputs
│   ├── canvas/
│   │   ├── schema.ts                    # Sticky Zod (no themeIndex enum, just int|null)
│   │   ├── intent-styles.ts             # DELETE — no intents in V2
│   │   └── controller.ts                # reuse useStickyBoardController; strip intent picker
│   └── proxy.ts                         # kept; only minor route allowlist changes
├── server/
│   ├── user-service.ts                  # ensure user, lookup, onboarding flag
│   ├── idea-service.ts                  # NEW: replace V1 deck/idea CRUD; per-idea lifecycle
│   ├── sticky-service.ts                # NEW
│   ├── comment-service.ts               # NEW
│   ├── recommendation-service.ts        # wraps lib/recommendation
│   ├── lock-service.ts                  # generates LockReport on lock
│   └── telemetry-service.ts             # kept; new event kinds
└── styles/
    ├── globals.css                      # Tailwind v4; carry button:cursor-pointer fix
    └── atomic.css                       # NEW: Atomic Ideation tokens (colors, fonts, paper-bg)
```

---

## 7. Visual language — ResearchGit V2 (lifted from Atomic Ideation)

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#F4EFE7` (cream paper) | Page background |
| `--bg-elev` | `#FFFFFF` | Cards, modals |
| `--ink` | `#1B1B1B` | Body text |
| `--ink-2` | `#4F4A41` | Section headers |
| `--muted` | `#8A847A` | Helper text |
| `--line` | `#E5DFD3` | Dividers |
| `--amber` / `--amber-soft` / `--amber-ink` | brand accents | "Recommended for you" highlight; near-proposal chip |
| `--u-rose` / `--u-amber` / `--u-citron` / `--u-mint` / `--u-sky` / `--u-iris` | 6 user colors | Author color signature dots, sticky-note theme background |
| `--f-serif` | "Lora" or "Playfair Display" | Headlines |
| `--f-hand` | handwritten italic (e.g., "Caveat" or similar) | Accents on words like *think*, *iterate*, *lock* |
| `--f-mono` | Geist Mono or JetBrains Mono | Tiny labels (timestamps, counts) |
| `--sh-1` / `--sh-3` | soft shadows | Card resting / hovered |
| Sticky note rotation | ±0.5° to ±1.5° | Each note's `transform: rotate(...)` |

### 7.1 The "delete is a button, not a tag" rule

User feedback: in V1, the delete affordance on stickies looked like a tag chip; users had to think about which to use. V2 rule: every action lives on a **toolbar with explicit button labels**, not as inline chips on the sticky body. The sticky body shows ONLY: text, author color stripe, optional reaction count. Hover reveals the action toolbar (Edit, Delete, React) below the sticky.

### 7.2 Avoid scaring new users with text walls

Reference spec lists 2–3 idea cards on the Generation screen, NOT 10. V2 commits to ≤3 cards (per ref spec §4.3 "Hard limit"). Card content is the synthesized fields (title + 1-line hypothesis + 2-3 method sentences + 2-3 novelty bullets), with paper grounding chips small and at the bottom. The dashboard's "Recommended for you" papers default to a collapsed 5-item view with "show more" instead of dumping the whole list.

---

## 8. Recommendation engine (phase 1 task)

### 8.1 Inspection plan

First implementation deliverable in Phase 1: `src/lib/recommendation/algorithm.md` — a written description of papersclaw.fun's recommendation behavior, captured by:

1. Launch chrome-devtools / Playwright against `https://papersclaw.fun/`.
2. Sign in with a Gmail belonging to one of the 3 first authors (Ziyi/Yiren/Hyanghee). User will provide credentials at implementation time.
3. Capture the network requests when the dashboard renders. Record: endpoint URLs, request bodies, response shapes.
4. Capture the DOM of the recommendations panel; record: count of recommended papers, ordering, any visible scoring or rationale ("recommended because…").
5. Repeat for each of the 3 authors to triangulate the algorithm.
6. Write `algorithm.md` describing the inferred logic. If the inferred logic uses an obvious technique (cosine over abstract embeddings; co-author graph distance; topic-tag overlap), implement that. If unclear, default to **cosine similarity over OpenAI text-embedding-3-large vectors of paper abstracts**, scored against the user's authored papers.

### 8.2 Implementation skeleton

```ts
// src/lib/recommendation/papers.ts
export async function recommendPapersForUser(userId: string, k: number): Promise<RecommendedPaper[]>;
//   1. Get user's authored Papers from Neo4j.
//   2. Compute or fetch their embeddings.
//   3. Score every other Paper by cosine; exclude user's own.
//   4. Return top-k with score and rationale string.

// src/lib/recommendation/collaborators.ts
export async function recommendCollaboratorsForUser(userId: string, k: number): Promise<{
  withYou: RecommendedAuthor[];     // similar topics, similar background
  stretchYou: RecommendedAuthor[];  // similar topics, DIFFERENT background
}>;
```

The dual "With You / Stretch You" track comes from Atomic Ideation's design-doc §9.1; it doubles the recommendation surface and makes for a stronger HCI story.

---

## 9. Implementation phases

User chose "full ref spec end-to-end" (D11) — one big push, not a staged ship. Internal phasing is for sequencing only:

| # | Phase | Output |
|---|---|---|
| **0** | **Cleanup** | Delete V1 deck/cluster paths (D16). Empty Neo4j of V1 schema (Deck/Cluster/Idea-V1/IdeaVersion-V1). Update `migrate-neo4j.ts` with V2 constraints. |
| **1** | **Auth + ingest + recommendation** | `papers_by_room.json` ingest into Neo4j (Authors + Papers). Google OAuth + name disambiguation. Browser-inspect papersclaw → write `algorithm.md` → implement papers/collaborators. Dashboard renders. |
| **2** | **Idea generation** | OpenAI `generateIdeas` prompt + Zod schema; `/ideas/new` page renders 2–3 cards with grounding citations; "Develop" routes to `/ideas/[id]/draft` with idea pre-filled. |
| **3** | **Sticky canvas + clustering** | Reuse `useStickyBoardController` (strip intent picker per D6). `/ideas/[id]/draft` shows the canvas. Auto-save stickies. "Suggest themes" button → AI cluster → recolor + theme labels (D14). |
| **4** | **Publish + marketplace** | Publish modal → AI synthesizes structured fields (D15) → user reviews/edits → status='open'. Marketplace lists with filters/sort per ref spec §4.5. |
| **5** | **Comments + iterate** | Public idea detail with type-tagged comments + threading depth=1. Initiator detail with mark-helpful + iterate-with-AI; iteration produces v2 with attribution map. |
| **6** | **Lock + report** | Typed "LOCK" modal; LockReport generation (Cypher aggregations + suggestedAcknowledgments via OpenAI); read-only locked view per ref spec §4.8. |
| **7** | **Onboarding + polish** | 3-step modal (per ref spec §2.1 + Atomic Ideation onboarding screenshots). a11y pass (`@axe-core/playwright`). Dark mode tokens optional. |
| **8** | **Tests** | Vitest: prompt builders, name lookup, recommendation scoring. Playwright: login + name match + dashboard renders + generate + draft + publish + lock. |

---

## 10. Things to scrap from V1

| File / dir | Reason |
|---|---|
| `src/server/deck-service.ts` | V1 Deck/Cluster paradigm gone. |
| `src/server/idea-service.ts` (V1 version) | Replace with V2 version that owns per-idea lifecycle. |
| `src/server/canvas-service.ts` | V2's canvas state lives on `Idea`, not `Canvas`. |
| `src/server/export-service.ts` | LockReport replaces it. |
| `src/lib/catalog/` | All cluster/theme sampling was tied to ResearchGalaxy. CHI dataset replaces it. |
| `src/lib/canvas/intent-styles.ts` | No intents in V2 (D6). |
| `src/components/canvas/` (intent-picker pieces) | Strip add/delete/merge UI; keep math. |
| `src/components/deck/` | Whole directory. |
| `src/components/admin/RegeneratePanel.tsx` | No deck regen in V2. |
| `src/app/admin/regenerate/`, `src/app/api/admin/regenerate/` | Same. |
| `src/app/deck/` | Replaced by `/dashboard`. |
| `src/app/idea/[id]/` (V1 layout) | Replaced by V2 routes (`/ideas/[id]/draft`, `/ideas/[id]`, `/ideas/[id]/locked`). |
| `src/lib/deck/contracts.ts` | New `src/lib/idea/contracts.ts` per ref spec §6. |
| `public/catalog/` (vendored ResearchGalaxy clusters) | Replaced by `papers_by_room.json` at repo root. |
| `scripts/sanitize-catalog.ts`, `scripts/vendor-catalog.ts`, `scripts/loader-smoke.ts` | All ResearchGalaxy-specific. |
| Neo4j data: `Deck`, `Cluster`, `Idea` (V1), `IdeaVersion` (V1), `AnchorPaper` | Drop. New `migrate-neo4j.ts` writes V2 constraints + a one-time DETACH DELETE for V1 nodes (idempotent). |

Components to **keep** (carry forward):

- `src/components/canvas/useStickyBoardController.ts` — pan/zoom math, drag handlers (sole source-of-truth for canvas mechanics).
- `src/lib/neo4j.ts` — driver singleton + `runRead` / `runWrite` (kept change: `disableLosslessIntegers: true`).
- `src/lib/auth.ts` + `src/proxy.ts` — auth flow; expand jwt callback for CHI name match.
- `src/lib/llm/client.ts` — OpenAI client (no more `temperature` override; `seed` ok).
- Tailwind v4 + Biome + lefthook + tsconfigs — unchanged.

---

## 11. Verification

| Layer | Approach |
|---|---|
| Type safety | `pnpm typecheck` (strict + `noUncheckedIndexedAccess`). |
| Lint + format | `pnpm check` (extend to `src/ scripts/`; widening `package.json` scripts to match lefthook scope). |
| Unit | Vitest: name-lookup matching (case/whitespace/diacritics), recommendation scoring determinism, prompt builders, theme-clustering Zod parses. |
| Integration | Playwright: full flow login → CHI match → dashboard renders → generate → develop → publish → comment → iterate → lock → report. Mock OpenAI responses with fixtures; mock papersclaw via the captured network records. |
| Browser inspection (manual, phase 1) | chrome-devtools / Playwright against papersclaw.fun. Record outputs to `src/lib/recommendation/algorithm.md`. |
| a11y | `@axe-core/playwright` on every screen. |
| Manual smoke | `pnpm dev` + chrome-devtools script: navigate each route, screenshot. |

---

## 12. Open risks + follow-up questions

| Risk | Mitigation / decision deferred |
|---|---|
| Papersclaw's algorithm cannot be cleanly inferred from observation | Default to OpenAI cosine over embeddings; document as inferred best-fit. User can iterate on `algorithm.md` after seeing behavior. |
| `papers_by_room.json` author names are non-canonical (initials, accents, "et al.") | Build a normalization layer in `src/lib/papers/lookup.ts` (lowercase, strip accents/diacritics, drop punctuation, fuzzy match Levenshtein ≤ 2). Show all candidates in disambiguation modal. |
| Synthesizing structured fields from free-form sticky notes via AI may produce garbage | The publish modal shows the synthesis as EDITABLE preview before status='open'. The initiator can rewrite any field. |
| Single-user canvas eliminates the V1 Liveblocks investment | Keep Liveblocks installed; revisit in V3 if multi-user co-edit becomes desirable. |
| 200 papersclaw users may not all be in `papers_by_room.json` (e.g., reviewers, attendees, students without CHI 2026 papers) | Per D4, hard-block. Communicate clearly: "V2 requires a CHI 2026 publication." |
| `algorithm.md` documentation step requires user-provided papersclaw credentials | Schedule that as a synchronous step at the start of Phase 1; halt if credentials unavailable. |

### 12.1 Things I'd ask the user during implementation (not blocking plan approval)

1. Once `algorithm.md` is written, confirm the inferred logic before I implement.
2. Color-signature palette: confirm the 6 user-color tokens (rose / amber / citron / mint / sky / iris) and how new users get assigned.
3. Onboarding tour copy: write or borrow from Atomic Ideation's `screen-extras.jsx`.
4. Lock-report's "suggested acknowledgments" — what tone/length? (Defaults to one paragraph, formal.)
5. After publish, can the initiator UNPUBLISH (back to draft)? (Ref spec is silent; default = no.)

### 12.2 Explicitly deferred to V3 (mentioned by user but out of V2 scope)

| User's verbal phrase | Why deferred | Where it would land in V3 |
|---|---|---|
| "people can bid the idea, AI can help review the researchers' background, then key contributors can decide how collaborations can be made" | Bidding/matchmaking is not in `research-idea-platform-spec.md`; adding it changes the per-idea unit (ref spec ends at lock + report; bidding lives AFTER lock). | Post-Lock: "Recruit contributors" surface where users with background-fit can express interest; AI scores their match; initiator picks. Adds `(:Bid)`, `(:Collaboration)` nodes. |
| "watch a talk (or a pitch of generated ideas)" | Decided as metaphor in Q2; not a literal feature in V2. | If a literal talk player ever ships, it would replace or supplement the dashboard's "Recommended for you" surface. |
| "the bubble is locked, only allowing the contributors to expand the idea" | This describes a post-lock collaborative-expansion phase, distinct from V2's read-only locked state. | V3: post-lock ideas re-open in a controlled "expansion mode" only for already-credited contributors. |
| "trace records are saved" | Already covered: IdeaVersion + Comment.absorbedInVersionIds form the trace. | No work needed; just confirming the existing data model satisfies the requirement. |

---

## 13. SPEC.md handoff

After plan approval, the implementation immediately:

1. Writes the final SPEC.md content from §1–§12 of this plan (de-duplicated, prose polished).
2. Performs Phase 0 cleanup (delete V1 dirs, write new migrate-neo4j with V2 constraints + one-time V1 cleanup).
3. Begins Phase 1.

The user said "create a new SPEC" — the new SPEC.md will be the published, prose-polished version of this plan's §1, §3, §4, §5, §6, §7, §10. The plan file (this document) is the working scaffold; SPEC.md becomes the durable spec.

---

## 14. Summary of interview answers

| Round | Question | Answer |
|---|---|---|
| R1 | Spec vs verbal reconciliation | Merge: spec skeleton + sticky canvas |
| R1 | "Watch a talk" semantics | Talk = metaphor; follow design doc literally |
| R1 | Room as entry point | Drop rooms; use papersclaw recommendations for real authors (Ziyi/Yiren/Hyanghee) |
| R1 | 3-theme display | Use Atomic Ideation prototype as design reference |
| R2 | Papersclaw integration mode | Reverse-engineer from papersclaw.fun |
| R2 | Chronofork visual reference | Use `/Users/edwardhu/Downloads/Atomic Ideation/` |
| R2 | Lab scope | "Type your name → see paper → recommend authors" |
| R2 | Stack reuse | Keep all 4: Next.js 16, Neo4j, Liveblocks, Auth.js v5 |
| R3 | Domain vs per-idea | Per-idea (ref spec native) |
| R3 | Reactions scope | V1 emoji bar (no typed reactions) |
| R3 | Papersclaw data | Reverse-engineer via local browser |
| R3 | Auth model | Google OAuth + name match in CHI dataset |
| R4 | Sticky model | 1 paste = 1 sticky (no auto-splitting) |
| R4 | No-CHI-match | Hard-block with retry/disambiguation |
| R4 | Recommendation algorithm | Launch local browser, inspect, document |
| R4 | Phase 1 cut + scope | NOT lab-only; full end-to-end; recommend papers + collaborators is the centerpiece |
